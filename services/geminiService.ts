
import { GoogleGenAI } from "@google/genai";

// Always initialize a new GoogleGenAI instance right before making an API call to ensure it uses the latest configuration.

export const askIslamicScholar = async (
  query: string,
  context?: string
): Promise<string> => {
  try {
    // Initializing correctly with a named parameter object.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `
You are a knowledgeable, respectful, and gentle Islamic scholar assistant.
Your goal is to help users understand the Quran and Islamic teachings.
You primarily speak in Urdu if the user asks in Urdu, or English if asked in English.
However, since this is a Quran app with Urdu translation, favor Urdu explanations for Tafseer.
Keep answers concise, accurate, and always reference Quranic verses if possible.
Avoid controversial sectarian debates; focus on the consensus (Ijma) or general understanding.

If a context (current Surah/Ayah) is provided, use it to frame your answer.
    `;

    // Complex reasoning tasks use gemini-3-pro-preview.
    const model = 'gemini-3-pro-preview';

    let finalPrompt = query;
    if (context) {
        finalPrompt = `Context: ${context}\n\nUser Question: ${query}`;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: finalPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    // Access the text property directly from the response.
    return response.text || "مذرت، میں ابھی جواب دینے سے قاصر ہوں۔"; 
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Something went wrong. Please check your API key or try again later.";
  }
};

export const fetchSurahIntroduction = async (surahName: string, surahNumber: number): Promise<string> => {
  const cacheKey = `surah_intro_${surahNumber}_v1`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Provide a comprehensive introduction for Surah ${surahName} (Chapter ${surahNumber}) based specifically on the commentary "Tafheem-ul-Quran" by Maulana Abul A'la Maududi.
      
      Output language: Urdu (اردو).
      
      Please cover the following points clearly:
      1. Period of Revelation (Is it Makki or Madani? In which year or phase of Prophethood was it revealed?)
      2. Historical Background (Conditions/Asbab al-Nuzul: What was happening in the life of the Holy Prophet (PBUH) and Muslims when this was revealed?)
      3. Central Theme (What is the main subject matter and stories discussed?)

      Format the response in clean Markdown with bold headings in Urdu. Keep the tone scholarly yet accessible.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    // Access the text property directly.
    const text = response.text || "";
    if (text) {
      localStorage.setItem(cacheKey, text);
    }
    return text;
  } catch (error) {
    console.error("Error fetching surah intro:", error);
    return "";
  }
};
