import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '5mb' }));

// Default owner passkey SHA-256 digest (overridden by process.env.ABOUT_PASSKEY when set)
const DEFAULT_PASSKEY_SHA256 = '47676b6ddfb4016d9e25c835df2d9635c739ee717c643c6ab1a7e0205e2fcaa5';
const PHOTO_TOKEN_SECRET = crypto.randomBytes(32);
const AUTHOR_PHOTO_STORE = path.join(__dirname, '.author-photo.json');

function verifyPasskeyDigest(inputPasskey: string): boolean {
  const inputHash = crypto.createHash('sha256').update(inputPasskey, 'utf8').digest();
  const expectedHash = process.env.ABOUT_PASSKEY
    ? crypto.createHash('sha256').update(process.env.ABOUT_PASSKEY, 'utf8').digest()
    : Buffer.from(DEFAULT_PASSKEY_SHA256, 'hex');
  if (inputHash.length !== expectedHash.length) return false;
  return crypto.timingSafeEqual(inputHash, expectedHash);
}

function createPhotoUnlockToken(): string {
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const payload = String(expiresAt);
  const sig = crypto.createHmac('sha256', PHOTO_TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyPhotoUnlockToken(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expectedSig = crypto.createHmac('sha256', PHOTO_TOKEN_SECRET).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

// Lazily import and initialize GoogleGenAI so container startup is fast and never blocked on API SDK loading
let aiClientPromise: Promise<any> | null = null;
async function getAiClient() {
  if (!aiClientPromise) {
    aiClientPromise = import('@google/genai').then(({ GoogleGenAI }) =>
      new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    );
  }
  return aiClientPromise;
}

const SCHOLAR_SYSTEM_INSTRUCTION = `
You are a knowledgeable, respectful, and gentle Islamic scholar assistant in a Holy Quran application.
Your goal is to help users understand the Quran, Surahs, Ayahs, and Islamic teachings with authentic references.
You primarily speak in clear Urdu if the user asks in Urdu or Roman Urdu, or in English if the user asks in English.
Keep answers concise, accurate, courteous, and reference Quranic verses where helpful.
Avoid sectarian debates; focus on consensus (Ijma) and mainstream scholarly understanding.
If a context (current Surah or Ayah) is provided, use it to ground your response.
`;

const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

app.post('/api/scholar', async (req, res) => {
  try {
    const { query, context } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    let contents = query;
    if (context) {
      contents = `Context: ${context}\n\nUser Question: ${query}`;
    }

    let lastError: any = null;
    for (const model of CANDIDATE_MODELS) {
      try {
        const ai = await getAiClient();
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SCHOLAR_SYSTEM_INSTRUCTION,
            temperature: 0.3,
          },
        });

        const text = response.text;
        if (text) {
          return res.json({ text, modelUsed: model });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} attempt failed:`, err?.message || err);
      }
    }

    throw lastError || new Error('No candidate model could generate a response');
  } catch (error: any) {
    console.error('Gemini Scholar API Error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      message: error?.message || 'Server error',
    });
  }
});

app.post('/api/surah-intro', async (req, res) => {
  try {
    const { surahName, surahNumber } = req.body;
    const prompt = `
      Provide a comprehensive introduction for Surah ${surahName} (Chapter ${surahNumber}) based specifically on the commentary "Tafheem-ul-Quran" by Maulana Abul A'la Maududi.
      
      Output language: Urdu (اردو).
      
      Please cover the following points clearly:
      1. Period of Revelation (Is it Makki or Madani? In which year or phase of Prophethood was it revealed?)
      2. Historical Background (Conditions/Asbab al-Nuzul: What was happening in the life of the Holy Prophet (PBUH) and Muslims when this was revealed?)
      3. Central Theme (What is the main subject matter and stories discussed?)

      Format the response in clean Markdown with bold headings in Urdu. Keep the tone scholarly yet accessible.
    `;

    let lastError: any = null;
    for (const model of CANDIDATE_MODELS) {
      try {
        const ai = await getAiClient();
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.3,
          },
        });

        const text = response.text;
        if (text) {
          return res.json({ text, modelUsed: model });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Surah intro model ${model} attempt failed:`, err?.message || err);
      }
    }

    throw lastError || new Error('Failed to generate intro');
  } catch (error: any) {
    console.error('Surah Intro API Error:', error);
    res.status(500).json({ error: 'Failed to generate intro' });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'Urdu' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `Translate the following text accurately and naturally into ${targetLang}.
Preserve cultural and religious nuances where relevant.
Only return the translated text with no extra conversational preamble or quotes.

Source Language: ${sourceLang}
Target Language: ${targetLang}
Text:
${text}`;

    let lastError: any = null;
    for (const model of CANDIDATE_MODELS) {
      try {
        const ai = await getAiClient();
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
          },
        });

        const translatedText = response.text?.trim();
        if (translatedText) {
          return res.json({ translatedText, modelUsed: model });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Translation model ${model} failed:`, err?.message || err);
      }
    }

    throw lastError || new Error('Failed to translate');
  } catch (error: any) {
    console.error('Translation API Error:', error);
    res.status(500).json({ error: 'Failed to translate', message: error?.message || 'Server error' });
  }
});

// Passkey protection endpoints for About page author picture
app.post('/api/verify-about-passkey', (req, res) => {
  const { passkey } = req.body || {};
  if (typeof passkey !== 'string' || !passkey.trim()) {
    return res.status(400).json({ verified: false, error: 'Passkey is required.' });
  }
  if (!verifyPasskeyDigest(passkey)) {
    return res.status(401).json({ verified: false, error: 'Incorrect passkey. Access denied.' });
  }
  const token = createPhotoUnlockToken();
  return res.json({ verified: true, token });
});

app.get('/api/about-photo', (_req, res) => {
  try {
    if (fs.existsSync(AUTHOR_PHOTO_STORE)) {
      const raw = fs.readFileSync(AUTHOR_PHOTO_STORE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.photoDataUrl === 'string') {
        return res.json({ customPhotoUrl: parsed.photoDataUrl });
      }
    }
  } catch (err) {
    console.warn('Could not read custom author photo store:', err);
  }
  return res.json({ customPhotoUrl: null });
});

app.post('/api/about-photo', (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = bearerToken || req.body?.token;

  if (!verifyPhotoUnlockToken(token)) {
    return res.status(403).json({ error: 'Valid passkey verification is required to change this picture.' });
  }

  const { photoDataUrl } = req.body || {};
  if (photoDataUrl === null) {
    try {
      if (fs.existsSync(AUTHOR_PHOTO_STORE)) {
        fs.unlinkSync(AUTHOR_PHOTO_STORE);
      }
    } catch (err) {
      console.warn('Could not remove custom author photo:', err);
    }
    return res.json({ customPhotoUrl: null });
  }

  if (
    typeof photoDataUrl !== 'string' ||
    !/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photoDataUrl)
  ) {
    return res.status(400).json({ error: 'Invalid image format. Only JPEG, PNG, or WebP data URLs are allowed.' });
  }

  try {
    fs.writeFileSync(AUTHOR_PHOTO_STORE, JSON.stringify({ photoDataUrl, updatedAt: new Date().toISOString() }), 'utf8');
    return res.json({ customPhotoUrl: photoDataUrl });
  } catch (err) {
    console.error('Failed to save custom author photo:', err);
    return res.status(500).json({ error: 'Failed to save author photo.' });
  }
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Full-Stack: mount Vite middleware in development, serve static in production
const distPath = path.resolve(__dirname, 'dist');
const isRunningViaTsx =
  process.execArgv.some((arg) => arg.includes('tsx')) ||
  process.env.npm_lifecycle_event === 'dev';
const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.npm_lifecycle_event === 'start' ||
  (!isRunningViaTsx &&
    process.env.NODE_ENV !== 'development' &&
    fs.existsSync(path.join(distPath, 'index.html')));

async function configureFrontend() {
  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
          ws: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      return;
    } catch (err) {
      if (!fs.existsSync(path.join(distPath, 'index.html'))) {
        throw err;
      }
      console.warn('Vite unavailable, falling back to built dist assets.');
    }
  }

  app.use(express.static(distPath, { maxAge: '1d' }));
  // Express 5 compatible SPA fallback (avoids path-to-regexp v8 '*' PathError)
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

await configureFrontend();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
