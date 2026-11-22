
export interface Juz {
  number: number;
  name: string;
  englishName: string;
}

export interface CombinedJuzData {
  juzNumber: number;
  arabicAyahs: Ayah[];
  englishAyahs: Ayah[];
  tafseerAyahs: Ayah[];
  pashtoAyahs: Ayah[];
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
  audio?: string;
  urduAudio?: string;
  pashtoAudio?: string;
  segments?: [number, number, number][]; // [wordPosition, startMs, endMs]
  surah?: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
  };
}

export interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: Ayah[];
  edition?: {
    identifier: string;
    language: string;
    name: string;
    englishName: string;
    format: string;
    type: string;
  };
}

export interface CombinedSurahData {
  surahInfo: Surah;
  arabicAyahs: Ayah[];
  englishAyahs: Ayah[];
  tafseerAyahs: Ayah[];
  pashtoAyahs: Ayah[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface Bookmark {
  surahNumber: number;
  ayahNumber: number; // numberInSurah
  surahName: string;
  timestamp: number;
}

export type ThemeType = 'paper' | 'dark' | 'sepia';
export type FontSize = number;
export type ScriptStyle = 'uthmani' | 'indopak';
export type AudioMode = 'arabic' | 'urdu' | 'pashto' | 'both' | 'ar_ps';
export type RecitationMode = 'surah' | 'continuous' | 'selective';

export interface AppSettings {
  theme: ThemeType;
  fontSize: FontSize;
  tafseerFontSize: FontSize;
  script: ScriptStyle;
  audioMode: AudioMode;
  recitationMode: RecitationMode;
  reciter?: string;
  showEnglish: boolean;
  showTafseer: boolean;
  showPashto: boolean;
}
