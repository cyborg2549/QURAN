import { Surah, CombinedSurahData, SurahDetail, ScriptStyle, CombinedJuzData } from '../types';

const BASE_URL = 'https://api.alquran.cloud/v1';
const LIST_CACHE_KEY = 'quran_surah_list_v3'; // Version bumped to invalidate old cache

// In-memory cache to store data for the current session (bullet speed navigation)
const memoryCache: Record<string, any> = {};

export const getSurahList = async (): Promise<Surah[]> => {
  try {
    // 1. Check Memory Cache (Fastest)
    if (memoryCache[LIST_CACHE_KEY]) {
      return memoryCache[LIST_CACHE_KEY];
    }

    // 2. Check Local Storage (Fast)
    const localData = localStorage.getItem(LIST_CACHE_KEY);
    if (localData) {
      const parsed = JSON.parse(localData);
      memoryCache[LIST_CACHE_KEY] = parsed;
      return parsed;
    }

    // 3. Network Request (Slowest - only first time)
    const response = await fetch(`${BASE_URL}/surah`);
    const data = await response.json();
    
    // Save to caches
    memoryCache[LIST_CACHE_KEY] = data.data;
    localStorage.setItem(LIST_CACHE_KEY, JSON.stringify(data.data));
    
    return data.data;
  } catch (error) {
    console.error('Error fetching surah list:', error);
    throw error;
  }
};

export const getSurahDetails = async (surahNumber: number, script: ScriptStyle = 'indopak'): Promise<CombinedSurahData> => {
  // Version bumped in cache key to force refresh for new content
  const cacheKey = `surah_${surahNumber}_${script}_v6`;

  try {
    // 1. Check Memory Cache
    if (memoryCache[cacheKey]) {
      return memoryCache[cacheKey];
    }

    // Determine script identifier
    // 'quran-indopak' is the specific edition for Pakistan/India region with full tashkeel
    const scriptId = script === 'indopak' ? 'quran-indopak' : 'quran-uthmani';

    // Fetch Arabic (Dynamic Script), English (Saheeh), Urdu (Maududi), Pashto (Abdulwali), Audio (Alafasy), and Pashto Audio (Afghan)
    const response = await fetch(
      `${BASE_URL}/surah/${surahNumber}/editions/${scriptId},en.saheeh,ur.maududi,ps.abdulwali,ar.alafasy,ps.afghan`
    );
    const data = await response.json();
    
    const allEditions: SurahDetail[] = data.data;

    const arabicData = allEditions.find(e => e.edition?.identifier === scriptId) || allEditions[0];
    const englishData = allEditions.find(e => e.edition?.identifier === 'en.saheeh') || allEditions[1];
    const tafseerData = allEditions.find(e => e.edition?.identifier === 'ur.maududi') || allEditions[2];
    const pashtoData = allEditions.find(e => e.edition?.identifier === 'ps.afghan') || allEditions[5]; // ps.afghan is text
    const audioData = allEditions.find(e => e.edition?.identifier === 'ar.alafasy') || allEditions[4];
    const pashtoAudioData = allEditions.find(e => e.edition?.identifier === 'ps.abdulwali') || allEditions[3]; // ps.abdulwali is audio

    // Merge audio URLs into arabic ayahs
    const mergedArabicAyahs = arabicData.ayahs.map((ayah, index) => ({
      ...ayah,
      audio: audioData.ayahs[index]?.audio,
      pashtoAudio: pashtoAudioData?.ayahs[index]?.audio
    }));

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
      englishAyahs: englishData.ayahs,
      tafseerAyahs: tafseerData.ayahs,
      pashtoAyahs: pashtoData.ayahs,
    };

    // Store in memory cache
    memoryCache[cacheKey] = result;
    return result;

  } catch (error) {
    console.error(`Error fetching surah ${surahNumber}:`, error);
    throw error;
  }
};


export const getJuzDetails = async (juzNumber: number, script: ScriptStyle = 'indopak'): Promise<CombinedJuzData> => {
  const cacheKey = `juz_${juzNumber}_${script}_v4`;

  try {
    // 1. Check Memory Cache
    if (memoryCache[cacheKey]) {
      return memoryCache[cacheKey];
    }

    // 2. Check Local Storage
    const localData = localStorage.getItem(cacheKey);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed && parsed.arabicAyahs && parsed.arabicAyahs.length > 0) {
          memoryCache[cacheKey] = parsed;
          return parsed;
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    const scriptId = script === 'indopak' ? 'quran-indopak' : 'quran-uthmani';
    const editions = [scriptId, 'en.saheeh', 'ur.maududi', 'ps.abdulwali', 'ar.alafasy', 'ps.afghan'];

    // Fetch each edition individually with a timeout
    const fetchWithTimeout = async (url: string, timeout = 15000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    const results = await Promise.all(
      editions.map(async (edition) => {
        try {
          const resp = await fetchWithTimeout(`${BASE_URL}/juz/${juzNumber}/${edition}`);
          if (!resp.ok) return null;
          const json = await resp.json();
          // Check for API-level success
          if (json.code !== 200 || !json.data) {
            console.warn(`API returned non-200 or missing data for Juz ${juzNumber}, edition ${edition}`);
            return null;
          }
          return json;
        } catch (e) {
          console.error(`Failed to fetch juz ${juzNumber} for edition ${edition}`, e);
          return null;
        }
      })
    );

    const arabicData = results[0]?.data;
    const englishData = results[1]?.data;
    const tafseerData = results[2]?.data;
    const pashtoData = results[5]?.data; // ps.afghan is text
    const audioData = results[4]?.data;
    const pashtoAudioData = results[3]?.data; // ps.abdulwali is audio

    if (!arabicData || !arabicData.ayahs || arabicData.ayahs.length === 0) {
      throw new Error(`Arabic text for Para ${juzNumber} could not be loaded. Please check your connection.`);
    }

    // Merge audio URLs into arabic ayahs safely
    const mergedArabicAyahs = arabicData.ayahs.map((ayah: any, index: number) => ({
      ...ayah,
      audio: audioData?.ayahs ? audioData.ayahs[index]?.audio : undefined,
      pashtoAudio: pashtoAudioData?.ayahs ? pashtoAudioData.ayahs[index]?.audio : undefined
    }));

    const result = {
      juzNumber: juzNumber,
      arabicAyahs: mergedArabicAyahs,
      englishAyahs: englishData?.ayahs || [],
      tafseerAyahs: tafseerData?.ayahs || [],
      pashtoAyahs: pashtoData?.ayahs || [],
    };

    // Store in caches
    memoryCache[cacheKey] = result;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      console.warn('Failed to save Juz to localStorage (quota exceeded?)');
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
  
  // Download Surahs
  for (let i = 1; i <= totalSurahs; i++) {
    try {
      await getSurahDetails(i, script);
      completed++;
      onProgress(Math.round((completed / totalItems) * 100));
      await new Promise(resolve => setTimeout(resolve, 30));
    } catch (error) {
      console.error(`Failed to download surah ${i}`, error);
    }
  }

  // Download Juz
  for (let i = 1; i <= totalJuz; i++) {
    try {
      await getJuzDetails(i, script);
      completed++;
      onProgress(Math.round((completed / totalItems) * 100));
      await new Promise(resolve => setTimeout(resolve, 30));
    } catch (error) {
      console.error(`Failed to download juz ${i}`, error);
    }
  }
};
