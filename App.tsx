import React, { useState, useEffect } from 'react';
import SurahList from './components/SurahList';
import Reader from './components/Reader';
import AboutAuthor from './components/AboutAuthor';
import Footer from './components/Footer';
import { AppSettings } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'paper',
  fontSize: 'lg',
  tafseerFontSize: 'lg', // Default for Urdu Tafseer
  script: 'indopak', // Explicitly default to IndoPak
  audioMode: 'both-pashto',
  recitationMode: 'surah',
  showEnglish: false,
  showTafseer: true, // Enabled by default as it's the primary Urdu content now
  showPashto: true // Enabled by default as per user request
};

const SETTINGS_KEY = 'quran_settings_v7'; // Version bumped to v7 to force new defaults

const App: React.FC = () => {
  const [view, setView] = useState<'list' | 'reader' | 'about'>('list');
  const [currentSurah, setCurrentSurah] = useState<number | undefined>(1);
  const [currentJuz, setCurrentJuz] = useState<number | undefined>(undefined);
  const [currentAyah, setCurrentAyah] = useState<number | undefined>(undefined);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        // Merge saved settings with defaults to ensure new fields are present
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } else {
          // Try to recover old settings but merge with new defaults
          const oldSaved = localStorage.getItem('quran_settings_v5');
          if (oldSaved) {
              const old = JSON.parse(oldSaved);
              return { ...DEFAULT_SETTINGS, ...old };
          }
          return DEFAULT_SETTINGS;
      }
    } catch (e) {
      console.warn("LocalStorage access failed, using defaults", e);
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("LocalStorage save failed", e);
    }
  }, [settings]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#about') {
        setView('about');
      } else if (hash.startsWith('#surah/')) {
        const parts = hash.split('/');
        const surahNum = parseInt(parts[1], 10);
        const ayahNum = parts[2] ? parseInt(parts[2], 10) : undefined;
        
        if (!isNaN(surahNum) && surahNum >= 1 && surahNum <= 114) {
          setCurrentSurah(surahNum);
          setCurrentJuz(undefined);
          setCurrentAyah(ayahNum);
          setView('reader');
        } else {
            setView('list');
        }
      } else if (hash.startsWith('#juz/')) {
        const parts = hash.split('/');
        const juzNum = parseInt(parts[1], 10);
        if (!isNaN(juzNum) && juzNum >= 1 && juzNum <= 30) {
          setCurrentJuz(juzNum);
          setCurrentSurah(undefined);
          setCurrentAyah(undefined);
          setView('reader');
        } else {
          setView('list');
        }
      } else {
        setView('list');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectSurah = (surahNumber: number, ayahNumber?: number) => {
    if (ayahNumber) {
        window.location.hash = `surah/${surahNumber}/${ayahNumber}`;
    } else {
        window.location.hash = `surah/${surahNumber}`;
    }
  };

  const handleSelectJuz = (juzNumber: number) => {
    window.location.hash = `juz/${juzNumber}`;
  };

  const handleNextSurah = () => {
    if (currentSurah && currentSurah < 114) {
      handleSelectSurah(currentSurah + 1);
    }
  };

  const handleNextJuz = () => {
    if (currentJuz && currentJuz < 30) {
      handleSelectJuz(currentJuz + 1);
    }
  };

  const handleBack = () => {
    window.location.hash = '';
  };

  const handleGoToAbout = () => {
    window.location.hash = 'about';
  };

  const handleGoToHome = () => {
    window.location.hash = '';
  };

  return (
    <div className={`antialiased min-h-screen font-sans flex flex-col selection:bg-emerald-200 selection:text-emerald-900 transition-colors duration-300 ${
      settings.theme === 'dark' ? 'bg-gray-950 text-gray-100' : 
      settings.theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-paper text-gray-900'
    }`}>
      {/* Main Content Area */}
      <main className="flex-1">
        {view === 'list' && (
          <SurahList 
            onSelectSurah={handleSelectSurah} 
            onSelectJuz={handleSelectJuz}
            onGoToAbout={handleGoToAbout} 
            settings={settings}
          />
        )}
        {view === 'reader' && (
          <Reader 
            surahNumber={currentSurah} 
            juzNumber={currentJuz}
            initialAyah={currentAyah} 
            onBack={handleBack} 
            onNextSurah={handleNextSurah}
            onNextJuz={handleNextJuz}
            settings={settings}
            onUpdateSettings={setSettings}
          />
        )}
        {view === 'about' && (
          <AboutAuthor 
            onBack={handleBack} 
          />
        )}
      </main>

      {/* Professional Global Footer */}
      <Footer 
        onGoToHome={handleGoToHome}
        onGoToAbout={handleGoToAbout}
      />
    </div>
  );
};

export default App;