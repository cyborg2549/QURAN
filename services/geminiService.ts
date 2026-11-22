// Client-side service calling full-stack server proxy endpoints (/api/scholar and /api/surah-intro)

export const askIslamicScholar = async (
  query: string,
  context?: string
): Promise<string> => {
  try {
    const response = await fetch('/api/scholar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, context }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || 'معذرت، میں ابھی جواب دینے سے قاصر ہوں۔';
  } catch (error) {
    console.error('Scholar Chat Error:', error);
    return 'معذرت، اس وقت رابطہ ممکن نہیں ہو سکا۔ براہ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔';
  }
};

export const fetchSurahIntroduction = async (
  surahName: string,
  surahNumber: number
): Promise<string> => {
  const cacheKey = `surah_intro_${surahNumber}_v2`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch (e) {
    // Ignore localStorage access failures in restricted mode
  }

  try {
    const response = await fetch('/api/surah-intro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ surahName, surahNumber }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.text || '';
    if (text) {
      try {
        localStorage.setItem(cacheKey, text);
      } catch (e) {}
    }
    return text;
  } catch (error) {
    console.error('Error fetching surah intro:', error);
    return '';
  }
};
