import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Loader2, Bookmark as BookmarkIcon, BookmarkCheck, 
  Settings as SettingsIcon, X, Moon, Sun, Type, Sparkles, Share2, Check,
  Minus, Plus, Headphones, ChevronDown
} from 'lucide-react';
import { CombinedSurahData, Bookmark, AppSettings, FontSize, ThemeType, CombinedJuzData } from '../types';
import { getSurahDetails, getJuzDetails } from '../services/quranApi';
import { getReciterById, getReciterAudioUrl, getReciterFallbackAudioUrl, QURAN_RECITERS } from '../services/reciters';
import { dbService } from '../services/db';
import LoadingSpinner from './LoadingSpinner';
import AIChat from './AIChat';
import PWAInstallButton from './PWAInstallButton';
import ReciterSelectorModal from './ReciterSelectorModal';

const BISMILLAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

interface ReaderProps {
  surahNumber?: number;
  juzNumber?: number;
  initialAyah?: number;
  onBack: () => void;
  onNextSurah?: () => void;
  onNextJuz?: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const Reader: React.FC<ReaderProps> = ({ surahNumber, juzNumber, initialAyah, onBack, onNextSurah, onNextJuz, settings, onUpdateSettings }) => {
  const [data, setData] = useState<CombinedSurahData | CombinedJuzData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false); // Default to false to avoid sudden noise on fast loads
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(true);
  const [volume, setVolume] = useState(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSettings, setShowSettings] = useState(false);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isUrduSpeaking, setIsUrduSpeaking] = useState(false);
  const [isTranslationPlaying, setIsTranslationPlaying] = useState(false);
  const [isPashtoPlaying, setIsPashtoPlaying] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const activeReciter = getReciterById(settings.reciter);

  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const activeWordIndexRef = useRef<number>(-1);
  const [activeUrduWordIndex, setActiveUrduWordIndex] = useState<number>(-1);
  const activeUrduWordIndexRef = useRef<number>(-1);
  const [activePashtoWordIndex, setActivePashtoWordIndex] = useState<number>(-1);
  const activePashtoWordIndexRef = useRef<number>(-1);
  const [consecutiveAudioErrors, setConsecutiveAudioErrors] = useState(0);

  // Buffer / Predictor Ref for faster audio switching
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    nextAudioRef.current = new Audio();
    nextAudioRef.current.preload = 'auto';
    return () => {
      if (nextAudioRef.current) {
        nextAudioRef.current.src = "";
        nextAudioRef.current.load();
      }
    };
  }, []);

  const speakUrdu = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
    setActiveUrduWordIndex(-1);
    activeUrduWordIndexRef.current = -1;
    
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
    if (!cleanText) {
        setIsUrduSpeaking(false);
        setIsTranslationPlaying(false);
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const urduVoice = voices.find(v => v.lang.toLowerCase().includes('ur')) || 
                        voices.find(v => v.lang.toLowerCase().includes('hi')) ||
                        voices.find(v => v.lang.toLowerCase().includes('fa'));
      if (urduVoice) {
        utterance.voice = urduVoice;
        utterance.lang = urduVoice.lang;
      } else {
        utterance.lang = 'ur-PK';
      }
      utterance.rate = 0.95;
      
      utterance.onend = () => {
          setIsUrduSpeaking(false);
          setIsTranslationPlaying(false);
          if (settings.audioMode === 'both' || settings.audioMode === 'urdu') {
              if (currentAyahIndex < (data?.arabicAyahs.length || 0) - 1) {
                  setCurrentAyahIndex(prev => prev + 1);
                  setActiveWordIndex(-1);
                  activeWordIndexRef.current = -1;
              } else {
                  setIsPlaying(false);
                  setCurrentAyahIndex(-1);
              }
          }
      };
      
      utterance.onerror = (e) => {
          console.error("Urdu TTS Error:", e);
          setIsUrduSpeaking(false);
          setIsTranslationPlaying(false);
      };
      
      setIsUrduSpeaking(true);
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
        setVoice();
    }
  }, [currentAyahIndex, data, settings.audioMode]);
  
  useEffect(() => {
    setConsecutiveAudioErrors(0);
  }, [surahNumber, juzNumber]);

  const visibleCountDefault = 20;
  const [visibleCount, setVisibleCount] = useState(visibleCountDefault);
  const initialScrollDoneRef = useRef<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateStatus = () => setIsAudioPaused(audio.paused);
    audio.addEventListener('play', updateStatus);
    audio.addEventListener('pause', updateStatus);
    audio.addEventListener('playing', updateStatus);
    
    return () => {
      audio.removeEventListener('play', updateStatus);
      audio.removeEventListener('pause', updateStatus);
      audio.removeEventListener('playing', updateStatus);
    };
  }, []);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.muted = false;
    }
  }, [isPlaying]);

  useEffect(() => {
    dbService.getUserData<Bookmark[]>('quran_bookmarks', []).then(saved => {
      if (saved && saved.length > 0) setBookmarks(saved);
    });
  }, []);

  // Handle initial ayah scroll
  useEffect(() => {
    if (!data || loading || !initialAyah || initialScrollDoneRef.current) return;
    
    let timeoutId: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 10;

    const scrollToInitial = () => {
        if (!data) return;
        const element = document.getElementById(`ayah-${initialAyah}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            initialScrollDoneRef.current = true;
        } else if (retryCount < maxRetries) {
            retryCount++;
            setVisibleCount(prev => Math.min(prev + 20, data.arabicAyahs.length));
            timeoutId = setTimeout(scrollToInitial, 250);
        } else {
            initialScrollDoneRef.current = true; // Give up after max retries
        }
    };

    timeoutId = setTimeout(scrollToInitial, 800);
    return () => clearTimeout(timeoutId);
  }, [data, loading, initialAyah]);

  // Infinite scroll observer
  useEffect(() => {
    if (!data || loading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
           setVisibleCount((prev) => Math.min(prev + 20, data.arabicAyahs.length));
        }
      },
      { rootMargin: '600px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => { if (loadMoreRef.current) observer.unobserve(loadMoreRef.current); };
  }, [data, loading]); // Removed visibleCount from dependencies

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentAyahIndex(-1);
    setIsPlaying(false);
    setIsTranslationPlaying(false);
    setIsPashtoPlaying(false);
    initialScrollDoneRef.current = false; // Reset scroll flag on new fetch

    try {
      let result;
      if (juzNumber) {
        result = await getJuzDetails(juzNumber, settings.script);
      } else if (surahNumber) {
        result = await getSurahDetails(surahNumber, settings.script);
      }

      if (result) {
        setData(result);
        if (initialAyah && !isNaN(initialAyah)) {
          setVisibleCount(Math.max(20, initialAyah + 10));
        } else {
          setVisibleCount(20);
          window.scrollTo(0, 0);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load content. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [surahNumber, juzNumber, settings.script, initialAyah]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const toggleBookmark = (ayahNumberInSurah: number, sNum?: number, sName?: string) => {
    if (!data) return;
    const actualSurahNumber = sNum || surahNumber || 0;
    const actualSurahName = sName || (data as CombinedSurahData).surahInfo?.englishName || `Surah ${actualSurahNumber}`;

    const isBookmarked = bookmarks.some(b => b.surahNumber === actualSurahNumber && b.ayahNumber === ayahNumberInSurah);
    const updated = isBookmarked 
      ? bookmarks.filter(b => !(b.surahNumber === actualSurahNumber && b.ayahNumber === ayahNumberInSurah))
      : [{ surahNumber: actualSurahNumber, ayahNumber: ayahNumberInSurah, surahName: actualSurahName, timestamp: Date.now() }, ...bookmarks];
    setBookmarks(updated);
    dbService.saveUserData('quran_bookmarks', updated).catch(() => {});
  };

  // Accurate viewport-aware centering: centers active Arabic text or Urdu translation in visible reading area
  const scrollElementToCenter = useCallback((element: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    if (!element) return;

    // Calculate top fixed player bar (75px) + sticky header height
    const headerBottom = headerRef.current 
      ? headerRef.current.getBoundingClientRect().bottom 
      : 155;
    const topSafeOffset = Math.max(75, headerBottom);
    const viewportHeight = window.innerHeight;
    const visibleHeight = Math.max(200, viewportHeight - topSafeOffset);
    
    // Middle point of the visible viewport area
    const targetCenterY = topSafeOffset + (visibleHeight / 2);
    
    const rect = element.getBoundingClientRect();
    const elementCenterY = rect.top + (rect.height / 2);
    
    const diff = elementCenterY - targetCenterY;
    
    // Smoothly reposition if not already in the middle
    if (Math.abs(diff) > 15) {
      window.scrollBy({
        top: diff,
        behavior
      });
    }
  }, []);

  // Consolidated Audio Control Logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !data) return;

    audio.volume = volume;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    if (currentAyahIndex === -1) {
      setCurrentAyahIndex(0);
      return;
    }

    const ayah = data.arabicAyahs[currentAyahIndex];
    if (!ayah) return;

    // Handle single-language audio modes
    if (settings.audioMode === 'urdu' && !isTranslationPlaying) {
      setIsTranslationPlaying(true);
      return;
    }
    if (settings.audioMode === 'pashto' && !isPashtoPlaying) {
      setIsPashtoPlaying(true);
      return;
    }

    if (isUrduSpeaking) return;

    // 1. Arabic Recitation Playback (Recited ONCE using selected Reciter)
    if (!isTranslationPlaying && !isPashtoPlaying) {
      const sNum = ayah.surah?.number || surahNumber || 1;
      const aNum = ayah.numberInSurah;
      const audioUrl = getReciterAudioUrl(activeReciter.id, sNum, aNum);
      if (audioUrl) {
        if (audio.src !== audioUrl) {
          audio.pause();
          audio.src = audioUrl;
          audio.load();
        }
        if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              if (err.name === 'NotAllowedError') {
                setIsAudioPaused(true);
              } else if (err.name !== 'AbortError') {
                console.error("Arabic Audio Play Error:", err);
              }
            });
          }
        }
      }

      // Prefetch next audio
      if (data.arabicAyahs[currentAyahIndex + 1] && nextAudioRef.current) {
        const nextAyah = data.arabicAyahs[currentAyahIndex + 1];
        const nextSNum = nextAyah.surah?.number || surahNumber || 1;
        const nextArabicUrl = getReciterAudioUrl(activeReciter.id, nextSNum, nextAyah.numberInSurah);
        nextAudioRef.current.src = (settings.audioMode === 'both' ? (nextAyah.urduAudio || nextArabicUrl) : nextArabicUrl) || "";
        nextAudioRef.current.load();
      }

      // Smooth auto-scroll: places the Arabic text under recitation in the middle of the screen
      if (isAutoScrolling) {
        setTimeout(() => {
          const el = document.getElementById(`ayah-arabic-${ayah.numberInSurah}`) || document.getElementById(`ayah-${ayah.numberInSurah}`);
          if (el) scrollElementToCenter(el);
        }, 80);
      }
    } else if (isTranslationPlaying) {
      // 2. Urdu Translation Audio Playback (Follows Arabic Recitation ONCE)
      const urduUrl = ayah.urduAudio;
      if (urduUrl) {
        if (!audio.src.includes(urduUrl)) {
          audio.pause();
          audio.src = urduUrl;
          audio.load();
        }
        if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              if (err.name !== 'AbortError') {
                console.warn("Urdu audio playback failed, falling back to TTS:", err);
                const urduText = data.tafseerAyahs[currentAyahIndex]?.text;
                if (urduText) speakUrdu(urduText);
                else handleAyahEnd();
              }
            });
          }
        }

        // Prefetch next Arabic audio
        if (data.arabicAyahs[currentAyahIndex + 1] && nextAudioRef.current) {
          const nextAyah = data.arabicAyahs[currentAyahIndex + 1];
          const nextSNum = nextAyah.surah?.number || surahNumber || 1;
          nextAudioRef.current.src = getReciterAudioUrl(activeReciter.id, nextSNum, nextAyah.numberInSurah);
          nextAudioRef.current.load();
        }
      } else {
        const urduText = data.tafseerAyahs[currentAyahIndex]?.text;
        if (urduText && !isUrduSpeaking) speakUrdu(urduText);
        else if (!urduText) handleAyahEnd();
      }

      // Smooth auto-scroll: places the Urdu translation below Arabic in the middle of the screen
      if (isAutoScrolling) {
        setTimeout(() => {
          const el = document.getElementById(`ayah-urdu-${ayah.numberInSurah}`);
          if (el) scrollElementToCenter(el);
        }, 80);
      }
    } else if (isPashtoPlaying) {
      // 3. Pashto Translation Playback
      const pashtoUrl = ayah.pashtoAudio;
      if (pashtoUrl) {
        if (!audio.src.includes(pashtoUrl)) {
          audio.pause();
          audio.src = pashtoUrl;
          audio.load();
        }
        if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              if (err.name !== 'AbortError') handleAyahEnd();
            });
          }
        }
      } else {
        handleAyahEnd();
      }

      if (isAutoScrolling) {
        setTimeout(() => {
          const el = document.getElementById(`ayah-pashto-${ayah.numberInSurah}`);
          if (el) scrollElementToCenter(el);
        }, 80);
      }
    }
  }, [isPlaying, currentAyahIndex, data, volume, isTranslationPlaying, isPashtoPlaying, settings.audioMode, activeReciter.id, surahNumber, isAutoScrolling, isUrduSpeaking, speakUrdu, scrollElementToCenter]);

  const playAyah = useCallback((index: number) => {
    if (!data) return;
    if (index >= visibleCount) {
      setVisibleCount(prev => Math.min(prev + 20, data.arabicAyahs.length));
    }
    setCurrentAyahIndex(index);
    setIsPlaying(true);
    setIsTranslationPlaying(false);
    setIsPashtoPlaying(false);
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
    setActiveUrduWordIndex(-1);
    activeUrduWordIndexRef.current = -1;
    setActivePashtoWordIndex(-1);
    activePashtoWordIndexRef.current = -1;

    if (isAutoScrolling) {
      setTimeout(() => {
        const ayah = data.arabicAyahs[index];
        if (ayah) {
          const el = document.getElementById(`ayah-arabic-${ayah.numberInSurah}`) || document.getElementById(`ayah-${ayah.numberInSurah}`);
          if (el) scrollElementToCenter(el);
        }
      }, 50);
    }
  }, [visibleCount, data, isAutoScrolling, scrollElementToCenter]);

  const handleAyahEnd = useCallback(() => {
    if (!data || currentAyahIndex === -1) return;

    // In 'both' mode: Arabic finished -> Now play Urdu translation ONCE
    if (settings.audioMode === 'both' && !isTranslationPlaying) {
      setIsTranslationPlaying(true);
      setActiveWordIndex(-1);
      activeWordIndexRef.current = -1;
      setActiveUrduWordIndex(-1);
      activeUrduWordIndexRef.current = -1;

      // Ensure the Urdu translation below automatically moves to the middle of the screen
      if (isAutoScrolling) {
        setTimeout(() => {
          const currentAyah = data.arabicAyahs[currentAyahIndex];
          if (currentAyah) {
            const el = document.getElementById(`ayah-urdu-${currentAyah.numberInSurah}`);
            if (el) scrollElementToCenter(el);
          }
        }, 50);
      }
      return;
    }

    // In 'ar_ps' mode: Arabic finished -> Now play Pashto translation ONCE
    if (settings.audioMode === 'ar_ps' && !isPashtoPlaying) {
      setIsPashtoPlaying(true);
      setActiveWordIndex(-1);
      activeWordIndexRef.current = -1;
      setActivePashtoWordIndex(-1);
      activePashtoWordIndexRef.current = -1;

      if (isAutoScrolling) {
        setTimeout(() => {
          const currentAyah = data.arabicAyahs[currentAyahIndex];
          if (currentAyah) {
            const el = document.getElementById(`ayah-pashto-${currentAyah.numberInSurah}`);
            if (el) scrollElementToCenter(el);
          }
        }, 50);
      }
      return;
    }

    // Finished translation OR in arabic-only mode -> Advance to next Ayah!
    setIsTranslationPlaying(false);
    setIsPashtoPlaying(false);
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
    setActiveUrduWordIndex(-1);
    activeUrduWordIndexRef.current = -1;
    setActivePashtoWordIndex(-1);
    activePashtoWordIndexRef.current = -1;

    if (currentAyahIndex < data.arabicAyahs.length - 1) {
      const nextIndex = currentAyahIndex + 1;
      if (nextIndex >= visibleCount) {
        setVisibleCount(prev => Math.min(prev + 20, data.arabicAyahs.length));
      }
      setCurrentAyahIndex(nextIndex);

      // Automatically move next verse Arabic text up into the middle of the screen
      if (isAutoScrolling) {
        setTimeout(() => {
          const nextAyah = data.arabicAyahs[nextIndex];
          if (nextAyah) {
            const el = document.getElementById(`ayah-arabic-${nextAyah.numberInSurah}`) || document.getElementById(`ayah-${nextAyah.numberInSurah}`);
            if (el) scrollElementToCenter(el);
          }
        }, 50);
      }
    } else {
      setIsPlaying(false);
      setCurrentAyahIndex(-1);
    }
  }, [data, currentAyahIndex, settings.audioMode, isTranslationPlaying, isPashtoPlaying, visibleCount, isAutoScrolling, scrollElementToCenter]);

  // Continuous position watchdog: ensures active recitation or translation stays in the middle
  // and as soon as it moves towards the bottom of the page, automatically moves it up to the middle of the screen
  useEffect(() => {
    if (!isPlaying || currentAyahIndex === -1 || !data || !isAutoScrolling) return;

    const interval = setInterval(() => {
      const ayah = data.arabicAyahs[currentAyahIndex];
      if (!ayah) return;

      const headerBottom = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 155;
      const targetCenterY = headerBottom + (window.innerHeight - headerBottom) / 2;

      let targetEl: HTMLElement | null = null;
      if (isTranslationPlaying) {
        targetEl = (activeUrduWordIndex >= 0 ? document.getElementById(`urdu-word-${currentAyahIndex}-${activeUrduWordIndex}`) : null)
          || document.getElementById(`ayah-urdu-${ayah.numberInSurah}`);
      } else if (isPashtoPlaying) {
        targetEl = (activePashtoWordIndex >= 0 ? document.getElementById(`pashto-word-${currentAyahIndex}-${activePashtoWordIndex}`) : null)
          || document.getElementById(`ayah-pashto-${ayah.numberInSurah}`);
      } else {
        targetEl = (activeWordIndex >= 0 ? document.getElementById(`word-${currentAyahIndex}-${activeWordIndex}`) : null)
          || document.getElementById(`ayah-arabic-${ayah.numberInSurah}`)
          || document.getElementById(`ayah-${ayah.numberInSurah}`);
      }

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        // If bottom has moved past middle by 45px or is near the bottom of viewport
        if (rect.bottom > targetCenterY + 45 || rect.bottom > window.innerHeight - 110 || rect.top < headerBottom + 10) {
          scrollElementToCenter(targetEl);
        }
      }
    }, 350);

    return () => clearInterval(interval);
  }, [isPlaying, currentAyahIndex, isTranslationPlaying, isPashtoPlaying, activeWordIndex, activeUrduWordIndex, activePashtoWordIndex, data, isAutoScrolling, scrollElementToCenter]);

  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const handleTimeUpdate = () => {
      if (!audio.duration || audio.duration === Infinity || currentAyahIndex === -1 || !data) return;

      if (isPashtoPlaying) {
        const ayah = data.pashtoAyahs[currentAyahIndex];
        if (!ayah) return;
        const words = ayah.text.trim().split(/[ \t\r\n]+/);
        if (words.length === 0) return;
        const durationAdjustment = Math.max(0.5, audio.duration - 0.4);
        const currentTimeRatio = Math.min(1, Math.max(0, audio.currentTime / durationAdjustment));
        const index = Math.min(words.length - 1, Math.floor(currentTimeRatio * words.length));
        
        if (index !== activePashtoWordIndexRef.current) {
          activePashtoWordIndexRef.current = index;
          setActivePashtoWordIndex(index);
          if (isAutoScrolling) {
            const wordElement = document.getElementById(`pashto-word-${currentAyahIndex}-${index}`);
            const pashtoContainer = document.getElementById(`ayah-pashto-${data.arabicAyahs[currentAyahIndex]?.numberInSurah}`);
            const targetEl = wordElement || pashtoContainer;
            if (targetEl) {
              const rect = targetEl.getBoundingClientRect();
              const headerBottom = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 155;
              const targetCenterY = headerBottom + (window.innerHeight - headerBottom) / 2;
              if (rect.bottom > targetCenterY + 35 || rect.bottom > window.innerHeight - 120 || rect.top < headerBottom + 10) {
                scrollElementToCenter(targetEl);
              }
            }
          }
        }
        return;
      }

      if (isTranslationPlaying) {
        const ayah = data.tafseerAyahs[currentAyahIndex];
        if (!ayah) return;
        const words = ayah.text.trim().split(/[ \t\r\n]+/);
        if (words.length === 0) return;
        const durationAdjustment = Math.max(0.5, audio.duration - 0.5);
        const currentTimeRatio = Math.min(1, Math.max(0, audio.currentTime / durationAdjustment));
        const index = Math.min(words.length - 1, Math.floor(currentTimeRatio * words.length));
        
        if (index !== activeUrduWordIndexRef.current) {
          activeUrduWordIndexRef.current = index;
          setActiveUrduWordIndex(index);
          if (isAutoScrolling) {
            const wordElement = document.getElementById(`urdu-word-${currentAyahIndex}-${index}`);
            const urduContainer = document.getElementById(`ayah-urdu-${data.arabicAyahs[currentAyahIndex]?.numberInSurah}`);
            const targetEl = wordElement || urduContainer;
            if (targetEl) {
              const rect = targetEl.getBoundingClientRect();
              const headerBottom = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 155;
              const targetCenterY = headerBottom + (window.innerHeight - headerBottom) / 2;
              // If Urdu word or translation moves towards the bottom of the page, automatically move it up to the middle
              if (rect.bottom > targetCenterY + 35 || rect.bottom > window.innerHeight - 120 || rect.top < headerBottom + 10) {
                scrollElementToCenter(targetEl);
              }
            }
          }
        }
        return;
      }

      // Arabic Word Synchronization (High-Precision Millisecond Alignment)
      const ayah = data.arabicAyahs[currentAyahIndex];
      if (!ayah) return;
      const words = ayah.text.trim().split(/[ \t\r\n]+/);
      if (words.length === 0) return;

      let index = -1;

      // 1. Precise Word-Level Timestamps from Quran.com (Alafasy only)
      if (activeReciter.id === 'alafasy' && ayah.segments && ayah.segments.length > 0) {
        const currentMs = audio.currentTime * 1000;
        
        // Find segment covering currentTime
        const seg = ayah.segments.find(([pos, sMs, eMs]) => currentMs >= sMs && currentMs < eMs);
        if (seg) {
          const segWordPos = seg[0] - 1; // 0-indexed position
          if (ayah.segments.length === words.length) {
            index = segWordPos;
          } else {
            // Scaled mapping if words count differs slightly
            index = Math.min(words.length - 1, Math.floor((segWordPos / ayah.segments.length) * words.length));
          }
        } else {
          // If in between segments, find the latest segment that started
          for (let s = ayah.segments.length - 1; s >= 0; s--) {
            if (currentMs >= ayah.segments[s][1]) {
              const segWordPos = ayah.segments[s][0] - 1;
              if (ayah.segments.length === words.length) {
                index = segWordPos;
              } else {
                index = Math.min(words.length - 1, Math.floor((segWordPos / ayah.segments.length) * words.length));
              }
              break;
            }
          }
          if (index === -1) index = 0;
        }
      } else {
        // 2. Calibrated mathematical synchronization model
        // Accounts for initial lead-in (0.12s) and tail silence / extended Madd (1.2s - 1.4s)
        const tailSilence = Math.min(1.4, Math.max(0.6, audio.duration * 0.22));
        const leadIn = 0.12;
        const activeDuration = Math.max(0.5, audio.duration - tailSilence - leadIn);
        const effectiveTime = Math.max(0, audio.currentTime - leadIn);
        const progress = Math.min(1, effectiveTime / activeDuration);

        const totalChars = words.reduce((sum, w) => sum + w.length, 0);
        const targetChars = progress * totalChars;
        let cumulative = 0;
        index = 0;
        for (let i = 0; i < words.length; i++) {
          cumulative += words[i].length;
          if (cumulative >= targetChars) {
            index = i;
            break;
          }
        }
      }

      index = Math.max(0, Math.min(words.length - 1, index));

      if (index !== activeWordIndexRef.current) {
        activeWordIndexRef.current = index;
        setActiveWordIndex(index);

        if (isAutoScrolling) {
          const wordElement = document.getElementById(`word-${currentAyahIndex}-${index}`);
          const arabicContainer = document.getElementById(`ayah-arabic-${ayah.numberInSurah}`) || document.getElementById(`ayah-${ayah.numberInSurah}`);
          const targetEl = wordElement || arabicContainer;
          if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const headerBottom = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 155;
            const targetCenterY = headerBottom + (window.innerHeight - headerBottom) / 2;
            // As soon as the arabic text moves towards the bottom of the page, automatically move up to middle
            if (rect.bottom > targetCenterY + 40 || rect.bottom > window.innerHeight - 130 || rect.top < headerBottom + 10) {
              scrollElementToCenter(targetEl);
            }
          }
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentAyahIndex, data, activeReciter.id, isAutoScrolling, isTranslationPlaying, isPashtoPlaying, scrollElementToCenter]);

  const getThemeClasses = () => {
    switch(settings.theme) {
      case 'dark': return 'bg-gray-900 border-gray-800 text-white';
      case 'sepia': return 'bg-[#fdf6e3] border-[#eee8d5] text-black';
      default: return 'bg-white border-gray-100 text-black';
    }
  };

  const getFontClasses = () => {
    return '';
  };

  const getTafseerStyle = () => {
    return { 
      fontWeight: '700',
      fontSize: `${settings.tafseerFontSize}px`,
      lineHeight: `${settings.tafseerFontSize * 1.5}px`
    };
  };

  const [copied, setCopied] = useState(false);
  const [copiedAyahIndex, setCopiedAyahIndex] = useState<number | null>(null);

  const handleShare = async () => {
    const origin = window.location.origin;
    let shareUrl = origin;
    if (origin.includes('ais-dev-')) {
      shareUrl = origin.replace('ais-dev-', 'ais-pre-');
    }
    shareUrl += window.location.hash;

    const shareData = {
      title: `Quran Kareem - ${data?.name || 'Surah'}`,
      text: `Read and listen to ${data?.name} (${data?.englishName}) with Urdu audio translation.`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleShareAyah = (e: React.MouseEvent, sNum: number, aNum: number, idx: number) => {
    e.stopPropagation();
    const origin = window.location.origin;
    let shareUrl = origin;
    if (origin.includes('ais-dev-')) {
      shareUrl = origin.replace('ais-dev-', 'ais-pre-');
    }
    const fullUrl = `${shareUrl}#surah/${sNum}/${aNum}`;
    
    const shareData = {
      title: `Quran Kareem - Ayah Link`,
      text: `Read Surah ${data?.name || ''} Ayah ${aNum} with Urdu audio translation.`,
      url: fullUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
       navigator.share(shareData).catch(err => console.error(err));
    } else {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopiedAyahIndex(idx);
        setTimeout(() => setCopiedAyahIndex(null), 2000);
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-10 text-center transition-colors duration-300 ${
        settings.theme === 'dark' ? 'bg-gray-950 text-white' : settings.theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-paper text-gray-900'
      }`}>
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-8 shadow-lg">
          <X size={48} />
        </div>
        <h2 className="text-3xl font-black mb-4">Oops! Something went wrong</h2>
        <p className="text-lg opacity-60 max-w-md mb-10 leading-relaxed">{error}</p>
        <div className="flex gap-4">
          <button 
            onClick={onBack}
            className="px-8 py-4 bg-gray-100 text-black font-bold rounded-2xl hover:bg-gray-200 transition-all active-press"
          >
            Go Back
          </button>
          <button 
            onClick={() => fetchDetails()}
            className="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all active-press shadow-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 relative transition-colors duration-300 ${
      settings.theme === 'dark' ? 'bg-gray-950' : settings.theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-paper'
    }`}>
      <audio 
        ref={audioRef} 
        preload="auto" 
        onWaiting={() => setIsAudioLoading(true)}
        onPlaying={() => setIsAudioLoading(false)}
        onCanPlay={() => setIsAudioLoading(false)}
        onEnded={handleAyahEnd} 
        onError={() => {
            const audio = audioRef.current;
            console.error("Audio playback error occurred");
            setIsAudioLoading(false);
            
            if (audio && data && currentAyahIndex !== -1) {
                // If translation audio failed, fall back to TTS or advance
                if (isTranslationPlaying) {
                    console.warn("Translation audio failed, falling back to TTS");
                    const urduText = data.tafseerAyahs[currentAyahIndex]?.text;
                    if (urduText) speakUrdu(urduText);
                    else handleAyahEnd();
                    return;
                }

                // If pashto audio failed, skip to next
                if (isPashtoPlaying) {
                    handleAyahEnd();
                    return;
                }

                const ayah = data.arabicAyahs[currentAyahIndex];
                if (!ayah) {
                    handleAyahEnd();
                    return;
                }
                const sNum = ayah.surah?.number || surahNumber || 1;
                const aNum = ayah.numberInSurah;
                const surahStr = sNum.toString().padStart(3, '0');
                const ayahStr = aNum.toString().padStart(3, '0');
                const primaryUrl = getReciterAudioUrl(activeReciter.id, sNum, aNum);
                const secondaryEveryAyahUrl = getReciterFallbackAudioUrl(activeReciter.id, sNum, aNum);
                const quranicAudioFallbackUrl = `https://download.quranicaudio.com/quran/mishary_rashid_alafasy/${surahStr}${ayahStr}.mp3`;

                if (audio.src === primaryUrl && secondaryEveryAyahUrl !== primaryUrl) {
                    audio.src = secondaryEveryAyahUrl;
                    audio.load();
                    audio.play().catch(() => handleAyahEnd());
                } else if (!audio.src.includes('quranicaudio.com')) {
                    audio.src = quranicAudioFallbackUrl;
                    audio.load();
                    audio.play().catch(() => handleAyahEnd());
                } else {
                    handleAyahEnd();
                }
            } else {
                handleAyahEnd();
            }
        }} 
      />

      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${showSettings ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowSettings(false)}></div>
        <div className={`absolute bottom-0 left-0 right-0 ${settings.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'} rounded-t-3xl p-4 shadow-2xl transition-transform duration-500 transform ${showSettings ? 'translate-y-0' : 'translate-y-full'} max-h-[85vh] overflow-y-auto`}>
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-black">Settings</h3>
                    <button onClick={() => setShowSettings(false)} className="p-1.5 bg-black/5 rounded-xl hover:bg-black/10 transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 block text-right">تھیم (Theme)</label>
                        <div className="flex gap-1.5">
                            {(['paper', 'sepia', 'dark'] as ThemeType[]).map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => onUpdateSettings({...settings, theme: t})}
                                    className={`flex-1 py-2 rounded-xl font-bold capitalize border-2 transition-all shadow-sm text-xs ${settings.theme === t ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-500/10 text-emerald-600 rounded-md">
                                {settings.fontSize}px
                            </span>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 block text-right">تحریر کا سائز (Arabic Font Size)</label>
                        </div>
                        <div className="flex items-center gap-3 py-1 bg-gray-50 dark:bg-gray-850 px-3 rounded-xl border border-black/[0.03]">
                            <button 
                                onClick={() => onUpdateSettings({...settings, fontSize: Math.max(28, settings.fontSize - 2)})}
                                className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Decrease"
                            >
                                <Minus size={14} />
                            </button>
                            <input 
                                type="range" 
                                min={28} 
                                max={120} 
                                step={2}
                                value={settings.fontSize} 
                                onChange={(e) => onUpdateSettings({...settings, fontSize: parseInt(e.target.value, 10)})}
                                className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                            />
                            <button 
                                onClick={() => onUpdateSettings({...settings, fontSize: Math.min(120, settings.fontSize + 2)})}
                                className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Increase"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-500/10 text-emerald-600 rounded-md">
                                {settings.tafseerFontSize}px
                            </span>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 block text-right">اردو ترجمہ کا سائز (Urdu Font Size)</label>
                        </div>
                        <div className="flex items-center gap-3 py-1 bg-gray-50 dark:bg-gray-850 px-3 rounded-xl border border-black/[0.03]">
                            <button 
                                onClick={() => onUpdateSettings({...settings, tafseerFontSize: Math.max(14, settings.tafseerFontSize - 1)})}
                                className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Decrease"
                            >
                                <Minus size={14} />
                            </button>
                            <input 
                                type="range" 
                                min={14} 
                                max={64} 
                                step={1}
                                value={settings.tafseerFontSize} 
                                onChange={(e) => onUpdateSettings({...settings, tafseerFontSize: parseInt(e.target.value, 10)})}
                                className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                            />
                            <button 
                                onClick={() => onUpdateSettings({...settings, tafseerFontSize: Math.min(64, settings.tafseerFontSize + 1)})}
                                className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Increase"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 block text-right">ترجمہ (Translations)</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button 
                                onClick={() => onUpdateSettings({...settings, showTafseer: !settings.showTafseer})}
                                className={`py-2 rounded-xl font-bold border-2 transition-all shadow-sm flex items-center justify-center gap-1.5 text-[10px] ${settings.showTafseer ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                            >
                                {settings.showTafseer ? <BookmarkCheck size={14} /> : <X size={14} />}
                                اردو (Urdu)
                            </button>
                            <button 
                                onClick={() => onUpdateSettings({...settings, showPashto: !settings.showPashto})}
                                className={`py-2 rounded-xl font-bold border-2 transition-all shadow-sm flex items-center justify-center gap-1.5 text-[10px] ${settings.showPashto ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                            >
                                {settings.showPashto ? <BookmarkCheck size={14} /> : <X size={14} />}
                                پښتو (Pashto)
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 block text-right">آڈیو موڈ (Audio Mode)</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {[
                                { id: 'arabic', label: 'Arabic' },
                                { id: 'urdu', label: 'Urdu' },
                                { id: 'pashto', label: 'Pashto' },
                                { id: 'both', label: 'Ar + Ur' },
                                { id: 'ar_ps', label: 'Ar + Ps' },
                            ].map(mode => (
                                <button 
                                    key={mode.id} 
                                    onClick={() => onUpdateSettings({...settings, audioMode: mode.id as any})}
                                    className={`py-1.5 rounded-lg font-bold text-[9px] border-2 transition-all ${settings.audioMode === mode.id ? 'border-black bg-black text-white shadow-sm' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 block text-right">قاری کا انتخاب (Quran Reciter — {QURAN_RECITERS.length} Available)</label>
                        <button
                            onClick={() => {
                                setShowSettings(false);
                                setShowReciterModal(true);
                            }}
                            className={`w-full p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 text-left ${
                                settings.theme === 'dark'
                                    ? 'bg-gray-800 border-gray-700 hover:border-emerald-500 text-white'
                                    : 'bg-gray-50 border-gray-200 hover:border-emerald-500 text-black'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                    <Headphones size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-xs sm:text-sm truncate">{activeReciter.name}</div>
                                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-arabic font-bold truncate">{activeReciter.arabicName} • {activeReciter.style}</div>
                                </div>
                            </div>
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex-shrink-0">
                                Change
                            </span>
                        </button>
                    </div>
                    <div>
                        <button 
                            onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.src = getReciterAudioUrl(activeReciter.id, 1, 1);
                                    audioRef.current.muted = false;
                                    audioRef.current.volume = volume;
                                    audioRef.current.play()
                                        .then(() => console.log("Audio is working!"))
                                        .catch(err => console.error("Audio test failed: " + err.message));
                                }
                            }}
                            className="w-full py-2.5 rounded-xl font-bold border-2 border-emerald-500 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all shadow-sm flex items-center justify-center gap-1.5 text-[10px]"
                        >
                            <Volume2 size={14} />
                            ٹیسٹ آڈیو (Test Audio: {activeReciter.name})
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Very Top Audio Player Bar - Fixed at the absolute top */}
      <div className={`fixed top-0 left-0 right-0 z-[100] w-full h-[75px] px-4 sm:px-6 border-b transition-all duration-300 flex items-center justify-between backdrop-blur-xl shadow-2xl ${
        settings.theme === 'dark' ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-100'
      }`}>
         <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={onBack} className="p-2 text-gray-400 hover:text-black transition-all active-press"><ArrowLeft size={24} /></button>
            <div className="h-8 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>
            <button onClick={() => { if(currentAyahIndex > 0) { setCurrentAyahIndex(prev => prev - 1); setIsTranslationPlaying(false); setActiveWordIndex(-1); activeWordIndexRef.current = -1; } }} disabled={currentAyahIndex <= 0} className="p-2 opacity-60 hover:opacity-100 active-press disabled:opacity-20"><SkipBack size={20} /></button>
            <button 
                onClick={() => {
                    if (isPlaying) {
                        setIsPlaying(false);
                        if (audioRef.current) audioRef.current.pause();
                    } else {
                        if (currentAyahIndex === -1) {
                            setCurrentAyahIndex(0);
                        }
                        setIsPlaying(true);
                    }
                }} 
                className="w-12 h-12 flex items-center justify-center bg-emerald-600 text-white rounded-full shadow-lg active-press transition-transform hover:scale-105 relative"
            >
                {isAudioLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : (
                    isPlaying && !isAudioPaused ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />
                )}
            </button>
            <button onClick={() => { if(currentAyahIndex < (data?.arabicAyahs.length || 0) - 1) { setCurrentAyahIndex(prev => prev + 1); setIsTranslationPlaying(false); setActiveWordIndex(-1); activeWordIndexRef.current = -1; } }} disabled={currentAyahIndex >= (data?.arabicAyahs.length || 0) - 1} className="p-2 opacity-60 hover:opacity-100 active-press disabled:opacity-20"><SkipForward size={20} /></button>
         </div>

         <div className="flex-1 px-4 hidden lg:block min-w-0">
            <div className="flex justify-between items-center mb-1.5 gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 truncate">
                    {currentAyahIndex === -1 ? 'Select an Ayah' : isTranslationPlaying ? `Ayah ${currentAyahIndex + 1} (Urdu Translation)` : isPashtoPlaying ? `Ayah ${currentAyahIndex + 1} (Pashto Translation)` : `Ayah ${currentAyahIndex + 1} (${activeReciter.name})`}
                    {isAudioLoading && ' (Loading...)'}
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest opacity-40 flex-shrink-0">
                    {data?.arabicAyahs.length || 0} Ayahs Total
                </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full bg-emerald-500 transition-all duration-500 ${isAudioLoading ? 'animate-pulse' : ''}`} 
                    style={{ width: `${((currentAyahIndex + 1) / (data?.arabicAyahs.length || 1)) * 100}%` }}
                ></div>
            </div>
         </div>

         <div className="flex items-center gap-2 sm:gap-4">
            <button
                onClick={() => setShowReciterModal(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all active-press ${
                  settings.theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-emerald-400 hover:bg-gray-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
                title="Change Quran Reciter (46 Qaris)"
            >
                <Headphones size={15} className="flex-shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[140px]">{activeReciter.name}</span>
                <ChevronDown size={13} className="opacity-60 flex-shrink-0" />
            </button>
            <div className="flex items-center gap-3 group">
                <button 
                    onClick={() => {
                        if (audioRef.current) {
                            audioRef.current.muted = !audioRef.current.muted;
                            setVolume(audioRef.current.muted ? 0 : 0.7);
                        }
                    }}
                    className="p-2 opacity-60 hover:opacity-100"
                >
                    {volume === 0 || (audioRef.current?.muted) ? (
                        <VolumeX size={18} className="text-red-500" />
                    ) : (
                        <Volume2 size={18} className="text-emerald-600" />
                    )}
                </button>
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume} 
                    onChange={(e) => {
                        const newVol = parseFloat(e.target.value);
                        setVolume(newVol);
                        if (audioRef.current) {
                            audioRef.current.volume = newVol;
                            audioRef.current.muted = newVol === 0;
                        }
                    }}
                    className="w-20 sm:w-32 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
            </div>
            <button 
                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                className={`p-2 rounded-xl transition-all ${isAutoScrolling ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                title="Auto-scroll"
            >
                <div className="flex flex-col items-center">
                    <div className={`w-1 h-1 rounded-full mb-0.5 ${isAutoScrolling ? 'bg-emerald-600' : 'bg-transparent'}`}></div>
                    <SkipForward size={14} className="rotate-90" />
                </div>
            </button>
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
            >
                <SettingsIcon size={20} />
            </button>
         </div>
      </div>

      <header ref={headerRef} className={`sticky top-[75px] z-50 px-6 py-5 flex items-center justify-between border-b transition-all duration-300 shadow-lg backdrop-blur-md ${getThemeClasses()}`}>
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 text-black bg-gray-100 hover:bg-gray-200 rounded-2xl active-press transition-all"><ArrowLeft size={24} /></button>
            <button onClick={handleShare} className="p-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-2xl active-press transition-all">
                {copied ? <Check size={24} /> : <Share2 size={24} />}
            </button>
        </div>
        <div className="text-center flex-1">
            <h1 className="font-arabic font-alqalam text-3xl text-black leading-none mb-1 font-bold" style={{ fontFamily: "'Al Qalam Quran Majeed', 'AlQalamQuranMajeed', serif" }}>
              {juzNumber ? `پارہ ${juzNumber}` : (data as CombinedSurahData)?.surahInfo?.name}
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
              {juzNumber ? `Para ${juzNumber}` : (data as CombinedSurahData)?.surahInfo?.englishName}
            </p>
        </div>
        <div className="flex items-center gap-2">
            <PWAInstallButton variant="header" className="!bg-emerald-50 !text-emerald-700 !border-emerald-200 hover:!bg-emerald-100 !py-2 !px-3 hidden sm:flex" />
            <button 
                onClick={() => isOnline ? setShowChat(true) : alert("AI Chat is only available online.")} 
                className={`p-3 rounded-2xl active-press transition-all ${isOnline ? 'text-black bg-gray-100 hover:bg-gray-200' : 'text-gray-300 bg-gray-50 cursor-not-allowed'}`}
                title={isOnline ? "AI Quran Assistant" : "Offline - AI Chat Disabled"}
            >
                <Sparkles size={24} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-3 text-black bg-gray-100 hover:bg-gray-200 rounded-2xl active-press transition-all"><SettingsIcon size={24} /></button>
        </div>
      </header>

      {/* Removed manual audio enable banner for automatic recitation */}

      <main className={`max-w-[98%] mx-auto px-2 sm:px-4 pt-44 overflow-visible transition-all duration-500`}>
        <div className="taj-page-border p-2 sm:p-4 bg-white shadow-2xl rounded-sm mb-10 border-[12px] border-double border-black/5">
            {!juzNumber && surahNumber !== 1 && surahNumber !== 9 && (
                <div className="flex flex-col items-center mb-6 px-2">
                    <div className="taj-surah-header w-full max-w-4xl py-6 px-4 border-4 border-black rounded-xl text-center relative overflow-hidden bg-white shadow-inner">
                        <div className="absolute top-0 left-0 w-full h-1 bg-black opacity-10"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-black opacity-10"></div>
                        <h2 className="font-indopak font-alqalam text-4xl md:text-6xl text-black mb-2" style={{ fontFamily: "'Al Qalam Quran Majeed', 'AlQalamQuranMajeed', serif" }} dir="rtl">
                            سُورَةُ {(data as CombinedSurahData)?.surahInfo?.name}
                        </h2>
                        <div className="flex justify-center gap-8 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            <span>{(data as CombinedSurahData)?.surahInfo?.revelationType}</span>
                            <span>{(data as CombinedSurahData)?.surahInfo?.numberOfAyahs} Ayahs</span>
                        </div>
                    </div>
                </div>
            )}

            {!juzNumber && surahNumber !== 1 && surahNumber !== 9 && (
                <div className="flex flex-col items-center mb-8 px-2">
                    <div className={`text-center py-6 px-8 border-4 border-black rounded-2xl w-full max-w-xl shadow-md bg-white`}>
                        <p className="font-indopak font-alqalam text-4xl md:text-6xl text-black" style={{ fontFamily: "'Al Qalam Quran Majeed', 'AlQalamQuranMajeed', serif" }} dir="rtl">
                            {BISMILLAH_TEXT}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">In the name of Allah, the Most Gracious, the Most Merciful</p>
                    </div>
                </div>
            )}

        <div className="space-y-0">
            {data?.arabicAyahs.slice(0, visibleCount).map((ayah, idx) => {
                const tafseerAyah = data.tafseerAyahs?.[idx];
                const pashtoAyah = data.pashtoAyahs?.[idx];
                const isCurrentAyah = currentAyahIndex === idx;
                
                // For Juz, we need to get surah info from the ayah itself if available
                const sNum = ayah.surah?.number || surahNumber;
                const sName = ayah.surah?.englishName;

                const bookmarked = bookmarks.some(b => b.surahNumber === sNum && b.ayahNumber === ayah.numberInSurah);
                const words = ayah.text.trim().split(/[ \t\r\n]+/);
                
                return (
                    <div 
                        key={ayah.number} 
                        id={`ayah-${ayah.numberInSurah}`}
                        onClick={() => playAyah(idx)}
                        className={`group relative transition-all duration-500 border-b border-black/5 last:border-0 cursor-pointer ${
                            isCurrentAyah && isPlaying 
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/30 rounded-2xl shadow-md border-emerald-500/30 ring-1 ring-emerald-500/20 my-2' 
                                : (isCurrentAyah ? 'bg-emerald-50/20' : 'hover:bg-black/5')
                        }`}
                        style={{ overflow: 'visible' }}
                    >
                        {/* Active Arabic Recitation Status Indicator */}
                        {isCurrentAyah && isPlaying && !isTranslationPlaying && !isPashtoPlaying && (
                            <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-emerald-500/20">
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black tracking-wider shadow-sm animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                    <span>تلاوتِ قرآن جاری ہے • {activeReciter.name}</span>
                                </div>
                                <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">آیت {ayah.numberInSurah}</span>
                            </div>
                        )}

                        {/* Beautiful Quranic Text Presentation in Al Qalam Quran Majeed font */}
                        <div 
                            id={`ayah-arabic-${ayah.numberInSurah}`}
                            className={`flex flex-wrap gap-x-0 gap-y-0 p-2 md:p-4 transition-all duration-500 ${
                                isCurrentAyah ? 'bg-emerald-500/5' : ''
                            }`} 
                            dir="rtl"
                        >
                            {words.map((word, wIdx) => {
                                const isWordActive = isCurrentAyah && isPlaying && !isTranslationPlaying && activeWordIndex === wIdx;
                                return (
                                    <span 
                                        key={wIdx} 
                                        id={`word-${idx}-${wIdx}`}
                                        className={`font-indopak font-alqalam transition-all duration-300 px-1 inline-flex items-center justify-center ${
                                            isWordActive 
                                                ? 'bg-black !text-[#4ade80] shadow-xl z-10 font-bold scale-110 rounded-md ring-2 ring-emerald-400' 
                                                : (settings.theme === 'dark' ? 'text-white' : 'text-black')
                                        }`}
                                        style={{ 
                                            fontFamily: "'Al Qalam Quran Majeed', 'AlQalamQuranMajeed', serif",
                                            minWidth: '0.5em', 
                                            fontSize: `${settings.fontSize}px`, 
                                            lineHeight: `${settings.fontSize * 1.55}px` 
                                        }}
                                    >
                                        {word}
                                    </span>
                                );
                            })}
                            
                            {/* Ayah Number Symbol - Inline with text */}
                            <div className="inline-flex items-center justify-center px-2 gap-2">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full border border-black/20 font-black text-[10px] transition-all duration-500 ${
                                    isCurrentAyah && !isTranslationPlaying ? 'bg-black text-white' : 'bg-white text-black/40'
                                }`}>
                                    {ayah.numberInSurah}
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playAyah(idx);
                                    }}
                                    className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 transition-all active-press"
                                    title="Play Arabic"
                                >
                                    <Play size={12} fill="currentColor" />
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleBookmark(ayah.numberInSurah, sNum, sName);
                                    }} 
                                    className={`p-1.5 rounded-lg transition-all ${bookmarked ? 'text-gold-600 bg-gold-50' : 'text-gray-300 bg-gray-50 hover:text-black'}`}
                                    title="Bookmark Ayah"
                                >
                                    <BookmarkIcon size={12} fill={bookmarked ? "currentColor" : "none"} />
                                </button>
                                <button 
                                    onClick={(e) => handleShareAyah(e, sNum || 1, ayah.numberInSurah, idx)} 
                                    className={`p-1.5 rounded-lg transition-all ${copiedAyahIndex === idx ? 'text-emerald-700 bg-emerald-50' : 'text-gray-300 bg-gray-50 hover:text-black'}`}
                                    title="Share Ayah Link"
                                >
                                    {copiedAyahIndex === idx ? <Check size={12} className="stroke-[3px]" /> : <Share2 size={12} />}
                                </button>
                            </div>
                        </div>

                        {/* Compact Translations: Below Arabic Text */}
                        <div className="px-4 pb-2 space-y-1">
                            {settings.showTafseer && tafseerAyah && (
                                <div 
                                    id={`ayah-urdu-${ayah.numberInSurah}`} 
                                    className={`text-right transition-all duration-500 pr-3 ${
                                        isCurrentAyah && isPlaying && isTranslationPlaying 
                                            ? 'border-r-4 border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl shadow-sm ring-1 ring-emerald-500/20' 
                                            : 'border-r-4 border-black/5'
                                    }`} 
                                    dir="rtl"
                                >
                                    <div 
                                        className={`font-urdu transition-colors duration-300 flex flex-wrap gap-x-1 justify-start ${
                                            settings.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                        }`}
                                        style={getTafseerStyle()}
                                    >
                                        <div className="w-full flex items-center justify-between mb-2">
                                            {isCurrentAyah && isPlaying && isTranslationPlaying ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black tracking-wider shadow-sm animate-pulse">
                                                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                                    <span>اردو ترجمہ جاری ہے • Urdu Translation in Progress</span>
                                                </div>
                                            ) : (
                                                <div></div>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentAyahIndex(idx);
                                                    setIsTranslationPlaying(true);
                                                    setIsPlaying(true);
                                                    setActiveWordIndex(-1);
                                                    activeWordIndexRef.current = -1;
                                                    setActiveUrduWordIndex(-1);
                                                    activeUrduWordIndexRef.current = -1;
                                                    if (isAutoScrolling) {
                                                      setTimeout(() => {
                                                        const el = document.getElementById(`ayah-urdu-${ayah.numberInSurah}`);
                                                        if (el) scrollElementToCenter(el);
                                                      }, 50);
                                                    }
                                                }}
                                                className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full hover:bg-emerald-100 hover:text-emerald-700 transition-all shadow-xs"
                                            >
                                                Play Urdu
                                            </button>
                                        </div>
                                        {tafseerAyah.text.trim().split(/[ \t\r\n]+/).map((word, wIdx) => {
                                            const isUrduWordActive = isCurrentAyah && isPlaying && isTranslationPlaying && activeUrduWordIndex === wIdx;
                                            return (
                                                <span 
                                                    key={wIdx} 
                                                    id={`urdu-word-${idx}-${wIdx}`}
                                                    className={`transition-all duration-300 ${
                                                        isUrduWordActive 
                                                            ? 'text-emerald-700 dark:text-emerald-400 font-black scale-110 bg-emerald-100 dark:bg-emerald-900/60 px-1 rounded-sm' 
                                                            : ''
                                                    }`}
                                                >
                                                    {word}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {settings.showPashto && pashtoAyah && (
                                <div 
                                    id={`ayah-pashto-${ayah.numberInSurah}`}
                                    className={`text-right transition-all duration-500 pr-3 mt-2 ${
                                        isCurrentAyah && isPlaying && isPashtoPlaying 
                                            ? 'border-r-4 border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl shadow-sm ring-1 ring-emerald-500/20' 
                                            : 'border-r-4 border-emerald-500/20'
                                    }`} 
                                    dir="rtl"
                                >
                                    <div 
                                        className={`font-urdu transition-colors duration-300 flex flex-wrap gap-x-1 justify-start ${
                                            settings.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                        }`}
                                        style={getTafseerStyle()}
                                    >
                                        <div className="w-full flex items-center justify-between mb-2">
                                            {isCurrentAyah && isPlaying && isPashtoPlaying ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black tracking-wider shadow-sm animate-pulse">
                                                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                                    <span>پښتو ترجمہ جاری ہے • Pashto Translation in Progress</span>
                                                </div>
                                            ) : (
                                                <div></div>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentAyahIndex(idx);
                                                    setIsPashtoPlaying(true);
                                                    setIsPlaying(true);
                                                    setActiveWordIndex(-1);
                                                    activeWordIndexRef.current = -1;
                                                    setActivePashtoWordIndex(-1);
                                                    activePashtoWordIndexRef.current = -1;
                                                    if (isAutoScrolling) {
                                                      setTimeout(() => {
                                                        const el = document.getElementById(`ayah-pashto-${ayah.numberInSurah}`);
                                                        if (el) scrollElementToCenter(el);
                                                      }, 50);
                                                    }
                                                }}
                                                className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full hover:bg-emerald-100 hover:text-emerald-700 transition-all shadow-xs"
                                            >
                                                Play Pashto
                                            </button>
                                        </div>
                                        {pashtoAyah.text.trim().split(/[ \t\r\n]+/).map((word, wIdx) => {
                                            const isPashtoWordActive = isCurrentAyah && isPlaying && isPashtoPlaying && activePashtoWordIndex === wIdx;
                                            return (
                                                <span 
                                                    key={wIdx} 
                                                    id={`pashto-word-${idx}-${wIdx}`}
                                                    className={`transition-all duration-300 ${
                                                        isPashtoWordActive 
                                                            ? 'text-emerald-700 dark:text-emerald-400 font-black scale-110 bg-emerald-100 dark:bg-emerald-900/60 px-1 rounded-sm' 
                                                            : ''
                                                    }`}
                                                >
                                                    {word}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
            {data && visibleCount < data.arabicAyahs.length && (
              <div ref={loadMoreRef} className="h-96 flex flex-col items-center justify-center gap-6">
                 <Loader2 className="animate-spin text-black" size={64} />
                 <p className="text-xs font-black text-black/30 uppercase tracking-[0.5em]">Continuing the Revelation</p>
              </div>
            )}
        </div>
    </main>


      <AIChat 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
        context={juzNumber 
          ? `Reading Para ${juzNumber} in the authentic Taj Quran Lahore style. Currently at Ayah ${currentAyahIndex + 1}.`
          : `Reading Surah ${(data as CombinedSurahData)?.surahInfo?.englishName} in the authentic Taj Quran Lahore style. Currently at Ayah ${currentAyahIndex + 1}.`
        }
      />
      <ReciterSelectorModal
        isOpen={showReciterModal}
        onClose={() => setShowReciterModal(false)}
        selectedReciterId={activeReciter.id}
        onSelectReciter={(reciterId) => {
          onUpdateSettings({ ...settings, reciter: reciterId });
        }}
        theme={settings.theme}
      />
    </div>
  );
};

export default Reader;