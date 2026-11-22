import React, { useState, useEffect, Suspense, lazy } from 'react';
import SurahList from './components/SurahList';
import Footer from './components/Footer';
import OfflineIndicator from './components/OfflineIndicator';
import LoadingSpinner from './components/LoadingSpinner';
import { dbService } from './services/db';
import { DEFAULT_RECITER_ID } from './services/reciters';
import { AppSettings } from './types';

const Reader = lazy(() => import('./components/Reader'));
const AboutAuthor = lazy(() => import('./components/AboutAuthor'));

const mapLegacyFontSize = (size: any, isArabic: boolean): number => {
  if (typeof size === 'number') return size;
  const mapping: Record<string, number> = isArabic ? {
    'sm': 36,
    'base': 48,
    'lg': 56,
    'xl': 72,
    '2xl': 96,
    '3xl': 110,
    '4xl': 130
  } : {
    'sm': 16,
    'base': 20,
    'lg': 24,
    'xl': 28,
    '2xl': 36,
    '3xl': 48,
    '4xl': 60
  };
  return mapping[size] || (isArabic ? 56 : 24);
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'paper',
  fontSize: 56,
  tafseerFontSize: 24, // Default for Urdu Tafseer
  script: 'indopak', // Explicitly default to IndoPak
  audioMode: 'both',
  recitationMode: 'surah',
  reciter: DEFAULT_RECITER_ID,
  showEnglish: false,
  showTafseer: true, // Enabled by default as it's the primary Urdu content now
  showPashto: false,
};

const SETTINGS_KEY = 'quran_settings_v10'; // Version bumped to v10 for speed optimizations

const App: React.FC = () => {
  const [view, setView] = useState<'list' | 'reader' | 'about'>('list');
  const [currentSurah, setCurrentSurah] = useState<number | undefined>(1);
  const [currentJuz, setCurrentJuz] = useState<number | undefined>(undefined);
  const [currentAyah, setCurrentAyah] = useState<number | undefined>(undefined);
  
  const [accountTab, setAccountTab] = useState<'profile' | 'arabi' | 'seerah'>('profile');
  const [dashboardTab, setDashboardTab] = useState<'surah' | 'juz'>('juz');
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        // Merge saved settings with defaults to ensure new fields are present
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          fontSize: mapLegacyFontSize(parsed.fontSize, true),
          tafseerFontSize: mapLegacyFontSize(parsed.tafseerFontSize, false)
        };
      } else {
          // Try to recover old settings but merge with new defaults
          const oldSaved = localStorage.getItem('quran_settings_v5');
          if (oldSaved) {
              const old = JSON.parse(oldSaved);
              return {
                ...DEFAULT_SETTINGS,
                ...old,
                fontSize: mapLegacyFontSize(old.fontSize, true),
                tafseerFontSize: mapLegacyFontSize(old.tafseerFontSize, false)
              };
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
      dbService.saveUserData(SETTINGS_KEY, settings).catch(() => {});
    } catch (e) {
      console.warn("LocalStorage save failed", e);
    }
  }, [settings]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#about' || hash === '#account' || hash === '#profile') {
        setView('about');
        setAccountTab('profile');
      } else if (
        hash === '#account/arabi' || hash === '#about/arabi' || 
        hash === '#arabi' || hash === '#app/arabi' || hash === '#/arabi' || hash === '#apps/arabi'
      ) {
        setView('about');
        setAccountTab('arabi');
      } else if (
        hash === '#account/seerah' || hash === '#about/seerah' || 
        hash === '#seerah' || hash === '#app/seerah' || hash === '#/seerah' || hash === '#apps/seerah'
      ) {
        setView('about');
        setAccountTab('seerah');
      } else if (hash.startsWith('#account?') || hash.startsWith('#about?')) {
        const queryParams = new URLSearchParams(hash.split('?')[1]);
        const tabParam = queryParams.get('tab') as any;
        if (tabParam && ['profile', 'arabi', 'seerah'].includes(tabParam)) {
          setAccountTab(tabParam);
        } else {
          setAccountTab('profile');
        }
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

  const handleGoToAbout = (tab: 'profile' | 'arabi' | 'seerah' = 'profile') => {
    setAccountTab(tab);
    window.location.hash = tab === 'profile' ? 'account' : `account/${tab}`;
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
            onUpdateSettings={setSettings}
            initialViewMode={dashboardTab}
            onViewModeChange={setDashboardTab}
          />
        )}
        {view === 'reader' && (
          <Suspense fallback={<LoadingSpinner />}>
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
          </Suspense>
        )}
        {view === 'about' && (
          <Suspense fallback={<LoadingSpinner />}>
            <AboutAuthor 
              onBack={handleBack}
              activeTab={accountTab}
              onTabChange={(newTab) => {
                setAccountTab(newTab);
                window.location.hash = newTab === 'profile' ? 'account' : `account/${newTab}`;
              }}
            />
          </Suspense>
        )}
      </main>

      {/* Professional Global Footer */}
      <Footer 
        onGoToHome={handleGoToHome}
        onGoToAbout={handleGoToAbout}
      />

      {/* Global Offline Mode Status Banner */}
      <OfflineIndicator />
    </div>
  );
};

export default App;