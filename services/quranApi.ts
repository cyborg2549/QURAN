import { Surah, CombinedSurahData, SurahDetail, ScriptStyle, CombinedJuzData } from '../types';
import { dbService } from './db';
import { DEFAULT_RECITER_ID, getReciterAudioUrl } from './reciters';

const BASE_URL = 'https://api.alquran.cloud/v1';
const LIST_CACHE_KEY = 'quran_surah_list_v4'; 

// In-memory cache to store data for the current session (bullet speed navigation)
const memoryCache: Record<string, any> = {};

/**
 * Helper to fetch with retries and timeout
 */
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, backoff = 500): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Response was not JSON');
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (retries > 0 && error.name !== 'AbortError') {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
};

export const getSurahList = async (): Promise<Surah[]> => {
  try {
    // 1. Check Memory Cache (Fastest)
    if (memoryCache[LIST_CACHE_KEY]) {
      return memoryCache[LIST_CACHE_KEY];
    }

    // 2. Check IndexedDB Persistent Cache
    const dbData = await dbService.get('general', LIST_CACHE_KEY);
    if (dbData) {
      memoryCache[LIST_CACHE_KEY] = dbData;
      return dbData;
    }

    // 3. Network Request (Slowest - only first time)
    const response = await fetchWithRetry(`${BASE_URL}/surah`);
    const data = await response.json();
    
    if (data.code !== 200 || !data.data) {
        throw new Error('Invalid response from surah list API');
    }

    // Save to caches
    memoryCache[LIST_CACHE_KEY] = data.data;
    await dbService.set('general', LIST_CACHE_KEY, data.data);

    // Warm up/prefetch first Surah and Juz on app startup (Non-blocking)
    setTimeout(() => {
      getSurahDetails(1, 'indopak').catch(() => {});
      getJuzDetails(1, 'indopak').catch(() => {});
    }, 100);
    
    return data.data;
  } catch (error) {
    console.error('Error fetching surah list:', error);
    throw error;
  }
};

export const getSurahDetails = async (surahNumber: number, script: ScriptStyle = 'indopak'): Promise<CombinedSurahData> => {
  // Version bumped to v12 to refresh with stable EveryAyah audio and accurate word-level segments
  const cacheKey = `surah_${surahNumber}_${script}_v12`;

  try {
    // 1. Check Memory Cache
    if (memoryCache[cacheKey]) {
      return memoryCache[cacheKey];
    }

    // 2. Check IndexedDB Persistent Cache
    const dbData = await dbService.get('surahs', cacheKey);
    if (dbData) {
      if (dbData.arabicAyahs && dbData.arabicAyahs.length > 0) {
        memoryCache[cacheKey] = dbData;
        return dbData;
      }
    }

    // Determine script identifier
    const scriptId = script === 'indopak' ? 'quran-indopak' : 'quran-uthmani';

    // Fetch editions and recitation timings in parallel
    const editions = `${scriptId},en.sahih,ur.maududi,ps.abdulwali`;
    
    const [editionsResult, timingsResult] = await Promise.allSettled([
      fetchWithRetry(`${BASE_URL}/surah/${surahNumber}/editions/${editions}`),
      fetch(`https://api.quran.com/api/v4/chapter_recitations/7/${surahNumber}?segments=true`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    ]);

    if (editionsResult.status !== 'fulfilled') {
      throw editionsResult.reason || new Error(`Failed to fetch surah ${surahNumber} data`);
    }

    const response = editionsResult.value;
    const data = await response.json();

    if (data.code !== 200 || !data.data || !Array.isArray(data.data)) {
        throw new Error(`Failed to fetch surah ${surahNumber} data: ${data.data || 'Invalid response'}`);
    }

    const allEditions: SurahDetail[] = data.data;

    const arabicData = allEditions.find(e => e.edition?.identifier === scriptId) || allEditions[0];
    const englishData = allEditions.find(e => e.edition?.identifier === 'en.sahih') || allEditions[1];
    const tafseerData = allEditions.find(e => e.edition?.identifier === 'ur.maududi') || allEditions[2];
    const pashtoData = allEditions.find(e => e.edition?.identifier === 'ps.abdulwali');

    if (!arabicData || !arabicData.ayahs) {
        throw new Error(`Arabic text for Surah ${surahNumber} could not be loaded.`);
    }

    // Build verse timings map if available
    const timingMap: Record<number, any> = {};
    if (timingsResult.status === 'fulfilled' && timingsResult.value?.audio_file?.timestamps) {
      timingsResult.value.audio_file.timestamps.forEach((item: any) => {
        const parts = item.verse_key?.split(':');
        if (parts && parts.length === 2) {
          const aNum = parseInt(parts[1], 10);
          timingMap[aNum] = item;
        }
      });
    }

    // Merge audio URLs and word segments into arabic ayahs
    const sNum = arabicData.number;
    const surahStr = sNum.toString().padStart(3, '0');

    const mergedArabicAyahs = arabicData.ayahs.map((ayah: any, index: number) => {
      const aNum = ayah.numberInSurah;
      const ayahStr = aNum.toString().padStart(3, '0');

      let cleanText = ayah.text;
      // Strip incorrectly prepended Bismillah from Ayah 1 of all surahs except Surah 1 & Surah 9
      if (index === 0 && sNum !== 1 && sNum !== 9) {
        cleanText = cleanText.replace(/^(بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ|بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ)\s*/u, '').trim();
      }

      let segments: [number, number, number][] | undefined = undefined;
      const tInfo = timingMap[aNum];
      if (tInfo && Array.isArray(tInfo.segments)) {
        const baseFrom = tInfo.timestamp_from ?? 0;
        segments = tInfo.segments.map(([pos, startMs, endMs]: [number, number, number]) => [
          pos,
          Math.max(0, startMs - baseFrom),
          Math.max(0, endMs - baseFrom)
        ]);
      }

      return {
        ...ayah,
        text: cleanText,
        // Direct, fast EveryAyah audio (default Alafasy, dynamically overridden by user's selected reciter)
        audio: getReciterAudioUrl(DEFAULT_RECITER_ID, sNum, aNum),
        // Direct, fast EveryAyah Urdu audio (Shamshad Ali Khan)
        urduAudio: `https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/${surahStr}${ayahStr}.mp3`,
        pashtoAudio: undefined,
        segments
      };
    });

    const result = {
      surahInfo: {
        number: arabicData.number,
        name: arabicData.name,
        englishName: arabicData.englishName,
        englishNameTranslation: arabicData.englishNameTranslation,
        numberOfAyahs: arabicData.numberOfAyahs,
        revelationType: arabicData.revelationType,
      },
      arabicAyahs: mergedArabicAyahs,
      englishAyahs: englishData?.ayahs || [],
      tafseerAyahs: tafseerData?.ayahs || [],
      pashtoAyahs: pashtoData?.ayahs || [],
    };

    // Store in caches
    memoryCache[cacheKey] = result;
    await dbService.set('surahs', cacheKey, result);

    // Speed Prefetch: non-block prefetch of the next Surah in background
    if (surahNumber < 114) {
      setTimeout(() => {
        const nextKey = `surah_${surahNumber + 1}_${script}_v12`;
        dbService.get('surahs', nextKey).then(exists => {
          if (!exists) {
            getSurahDetails(surahNumber + 1, script).catch(() => {});
          }
        });
      }, 500);
    }
    
    return result;

  } catch (error) {
    console.error(`Error fetching surah ${surahNumber}:`, error);
    throw error;
  }
};


export const getJuzDetails = async (juzNumber: number, script: ScriptStyle = 'indopak'): Promise<CombinedJuzData> => {
  const cacheKey = `juz_${juzNumber}_${script}_v7`;

  try {
    // 1. Check Memory Cache
    if (memoryCache[cacheKey]) {
      return memoryCache[cacheKey];
    }

    // 2. Check IndexedDB Persistent Cache
    const dbData = await dbService.get('juzs', cacheKey);
    if (dbData) {
      if (dbData.arabicAyahs && dbData.arabicAyahs.length > 0) {
        memoryCache[cacheKey] = dbData;
        return dbData;
      }
    }

    const scriptId = script === 'indopak' ? 'quran-indopak' : 'quran-uthmani';
    
    // AlQuran Cloud batch endpoint for Juz is unstable (returns 500), 
    // so we fetch editions individually instead.
    const identifiers = [scriptId, 'en.sahih', 'ur.maududi', 'ps.abdulwali'];
    
    const responses = await Promise.all(
      identifiers.map(async (id) => {
        try {
          const resp = await fetchWithRetry(`${BASE_URL}/juz/${juzNumber}/${id}`);
          const json = await resp.json();
          return json.code === 200 ? json.data : null;
        } catch (e) {
          console.error(`Failed to fetch juz ${juzNumber} edition ${id}:`, e);
          return null;
        }
      })
    );

    const arabicData = responses[0];
    const englishData = responses[1];
    const tafseerData = responses[2];
    const pashtoData = responses[3];

    if (!arabicData || !arabicData.ayahs || arabicData.ayahs.length === 0) {
      throw new Error(`Arabic text for Para ${juzNumber} could not be loaded. Please check your connection.`);
    }

    // Merge audio URLs into arabic ayahs safely using stable EveryAyah CDN
    const mergedArabicAyahs = arabicData.ayahs.map((ayah: any) => {
      const sNum = ayah.surah?.number || 1;
      const aNum = ayah.numberInSurah;
      const surahStr = sNum.toString().padStart(3, '0');
      const ayahStr = aNum.toString().padStart(3, '0');

      let cleanText = ayah.text;
      if (aNum === 1 && sNum !== 1 && sNum !== 9) {
        cleanText = cleanText.replace(/^(بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ|بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ)\s*/u, '').trim();
      }

      return {
        ...ayah,
        text: cleanText,
        audio: getReciterAudioUrl(DEFAULT_RECITER_ID, sNum, aNum),
        urduAudio: `https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/${surahStr}${ayahStr}.mp3`,
        pashtoAudio: undefined
      };
    });

    const result = {
      juzNumber: juzNumber,
      arabicAyahs: mergedArabicAyahs,
      englishAyahs: englishData?.ayahs || [],
      tafseerAyahs: tafseerData?.ayahs || [],
      pashtoAyahs: pashtoData?.ayahs || [],
    };

    // Store in caches
    memoryCache[cacheKey] = result;
    await dbService.set('juzs', cacheKey, result);

    // Speed Prefetch: non-block prefetch of the next Juz/Para in background
    if (juzNumber < 30) {
      setTimeout(() => {
        const nextKey = `juz_${juzNumber + 1}_${script}_v5`;
        dbService.get('juzs', nextKey).then(exists => {
          if (!exists) {
            getJuzDetails(juzNumber + 1, script).catch(() => {});
          }
        });
      }, 500);
    }
    
    return result;

  } catch (error: any) {
    console.error(`Error fetching juz ${juzNumber}:`, error);
    throw error;
  }
};

/**
 * Downloads all Quran data (Text + Tafseer) for offline usage.
 * Iterates through all 114 Surahs and triggers fetch, which Service Worker caches.
 */
export const downloadQuranData = async (
  script: ScriptStyle, 
  onProgress: (progress: number) => void
): Promise<void> => {
  const totalSurahs = 114;
  const totalJuz = 30;
  const totalItems = totalSurahs + totalJuz;
  let completed = 0;
  
  const CHUNK_SIZE = 8; // Faster parallel downloads

  // Helper to process download with existence check
  const processDownload = async (type: 'surahs' | 'juzs', num: number) => {
    try {
      const cacheKey = type === 'surahs' 
        ? `surah_${num}_${script}_v8` 
        : `juz_${num}_${script}_v5`;
      
      // Fast check if exists to avoid redundant network hits
      const exists = await dbService.get(type, cacheKey);
      if (exists && exists.arabicAyahs && exists.arabicAyahs.length > 0) {
        completed++;
        onProgress(Math.round((completed / totalItems) * 100));
        return;
      }

      if (type === 'surahs') {
        await getSurahDetails(num, script);
      } else {
        await getJuzDetails(num, script);
      }
      
      completed++;
      onProgress(Math.round((completed / totalItems) * 100));
    } catch (error) {
      console.error(`Failed to download ${type} ${num}`, error);
    }
  };

  // 1. Download Surahs in chunks
  for (let i = 1; i <= totalSurahs; i += CHUNK_SIZE) {
    const chunk = Array.from({ length: Math.min(CHUNK_SIZE, totalSurahs - i + 1) }, (_, index) => i + index);
    await Promise.all(chunk.map(num => processDownload('surahs', num)));
    // Small yield to UI thread
    if (i % (CHUNK_SIZE * 2) === 0) await new Promise(r => setTimeout(r, 10));
  }

  // 2. Download Juz in chunks
  for (let i = 1; i <= totalJuz; i += CHUNK_SIZE) {
    const chunk = Array.from({ length: Math.min(CHUNK_SIZE, totalJuz - i + 1) }, (_, index) => i + index);
    await Promise.all(chunk.map(num => processDownload('juzs', num)));
    if (i % (CHUNK_SIZE * 2) === 0) await new Promise(r => setTimeout(r, 10));
  }
};
