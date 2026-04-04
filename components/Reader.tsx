import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Loader2, Bookmark as BookmarkIcon, BookmarkCheck, 
  Settings as SettingsIcon, X, Moon, Sun, Type, Sparkles
} from 'lucide-react';
import { CombinedSurahData, Bookmark, AppSettings, FontSize, ThemeType, CombinedJuzData } from '../types';
import { getSurahDetails, getJuzDetails } from '../services/quranApi';
import LoadingSpinner from './LoadingSpinner';
import AIChat from './AIChat';

const BISMILLAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const BISMILLAH_AUDIO = "https://everyayah.com/data/Alafasy_128kbps/001001.mp3";

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
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(true);
  const [volume, setVolume] = useState(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isBismillahPlaying, setIsBismillahPlaying] = useState(false);
  const [isUrduSpeaking, setIsUrduSpeaking] = useState(false);
  const [isPashtoSpeaking, setIsPashtoSpeaking] = useState(false);
  const [isTranslationPlaying, setIsTranslationPlaying] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  const speakUrdu = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
    
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
    if (!cleanText) {
        setIsUrduSpeaking(false);
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

  const speakPashto = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
    
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
    if (!cleanText) {
        setIsPashtoSpeaking(false);
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const pashtoVoice = voices.find(v => v.lang.toLowerCase().includes('ps')) || 
                          voices.find(v => v.lang.toLowerCase().includes('ur')) ||
                          voices.find(v => v.lang.toLowerCase().includes('hi')) ||
                          voices.find(v => v.lang.toLowerCase().includes('fa'));
      if (pashtoVoice) {
        utterance.voice = pashtoVoice;
        utterance.lang = pashtoVoice.lang;
      } else {
        utterance.lang = 'ps-AF';
      }
      utterance.rate = 0.95;
      
      utterance.onend = () => {
          setIsPashtoSpeaking(false);
          if (settings.audioMode === 'both-pashto' || settings.audioMode === 'pashto') {
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
          console.error("Pashto TTS Error:", e);
          setIsPashtoSpeaking(false);
      };
      
      setIsPashtoSpeaking(true);
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
        setVoice();
    }
  }, [currentAyahIndex, data, settings.audioMode]);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const activeWordIndexRef = useRef<number>(-1);
  const [consecutiveAudioErrors, setConsecutiveAudioErrors] = useState(0);
  
  useEffect(() => {
    setConsecutiveAudioErrors(0);
  }, [surahNumber, juzNumber]);

  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedBismillahRef = useRef<boolean>(false);

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
    const saved = localStorage.getItem('quran_bookmarks');
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!data || loading) return;
    
    // Handle initial ayah scroll more robustly
    if (initialAyah) {
        const scrollToInitial = () => {
            const element = document.getElementById(`ayah-${initialAyah}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (visibleCount < (data.arabicAyahs.length)) {
                setVisibleCount(prev => Math.min(prev + 20, data.arabicAyahs.length));
                setTimeout(scrollToInitial, 100);
            }
        };
        setTimeout(scrollToInitial, 800);
    }

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
  }, [data, loading, visibleCount]);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentAyahIndex(-1);
    setIsPlaying(false);
    setIsBismillahPlaying(false);
    hasPlayedBismillahRef.current = false;

    try {
      let result;
      if (juzNumber) {
        result = await getJuzDetails(juzNumber, settings.script);
      } else if (surahNumber) {
        result = await getSurahDetails(surahNumber, settings.script);
      }

      if (result) {
        setData(result);
        if (initialAyah) {
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
    localStorage.setItem('quran_bookmarks', JSON.stringify(updated));
  };

  // Consolidated Audio Control Logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !data) return;

    // Ensure volume is synced
    audio.volume = volume;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    // If we have a valid index and we are playing
    if (currentAyahIndex !== -1 && !isTranslationPlaying) {
      const ayah = data.arabicAyahs[currentAyahIndex];
      
      // Handle Urdu only mode
      if (settings.audioMode === 'urdu') {
          if (!isUrduSpeaking) {
              const urduText = data.tafseerAyahs[currentAyahIndex].text;
              speakUrdu(urduText);
          }
          return;
      }

      // Handle Pashto only mode
      if (settings.audioMode === 'pashto') {
          if (!isPashtoSpeaking) {
              const pashtoText = data.pashtoAyahs[currentAyahIndex].text;
              speakPashto(pashtoText);
          }
          return;
      }

      // If we are currently speaking Urdu or Pashto in 'both' modes, don't play Arabic
      if (isUrduSpeaking || isPashtoSpeaking) return;

      // Handle Bismillah logic first
      if (currentAyahIndex === 0 && surahNumber !== 9 && surahNumber !== 1 && !hasPlayedBismillahRef.current) {
        if (!isBismillahPlaying) {
          setIsBismillahPlaying(true);
          const bismillahUrl = `${BISMILLAH_AUDIO}?cb=${Date.now()}`;
          audio.src = bismillahUrl;
          audio.load();
          audio.play().catch(err => {
            if (err.name === 'NotAllowedError') {
                console.warn("Autoplay blocked for Bismillah. Waiting for user interaction.");
                setIsAudioPaused(true);
            } else if (err.name !== 'AbortError') {
                console.error("Bismillah Play Error:", err);
                setIsBismillahPlaying(false);
                hasPlayedBismillahRef.current = true;
                setConsecutiveAudioErrors(prev => prev + 1);
                playAyah(0);
            }
          });
        }
        return;
      }

      // Normal Ayah Playback
      if (ayah.audio && !audio.src.includes(ayah.audio)) {
        audio.pause();
        // Add cache-busting to the URL to force re-fetch and avoid stale/broken cache
        const audioUrl = ayah.audio.includes('?') ? `${ayah.audio}&cb=${Date.now()}` : `${ayah.audio}?cb=${Date.now()}`;
        audio.src = audioUrl;
        audio.load();
        audio.muted = false;
        audio.volume = volume;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err.name === 'NotAllowedError') {
                console.warn("Autoplay blocked for Ayah. Waiting for user interaction.");
                setIsAudioPaused(true);
            } else if (err.name !== 'AbortError') {
              console.error("Ayah Play Error:", err, "URL:", audioUrl);
              setConsecutiveAudioErrors(prev => prev + 1);
              handleAyahEnd();
            }
          });
        }

        // Scroll into view
        setTimeout(() => {
          const element = document.getElementById(`ayah-${ayah.numberInSurah}`);
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else if (audio.paused && isPlaying) {
        // Resume if paused but src is correct
        audio.play().catch(err => {
          if (err.name === 'NotAllowedError') {
              setIsAudioPaused(true);
          } else if (err.name !== 'AbortError') {
              console.error("Resume Error:", err);
          }
        });
      } else if (!isPlaying && !audio.paused) {
        audio.pause();
      }
    } else if (isPlaying && isTranslationPlaying) {
        // Resume Pashto audio if paused
        if (audio.paused) {
            audio.play().catch(err => {
                if (err.name === 'NotAllowedError') {
                    setIsAudioPaused(true);
                } else if (err.name !== 'AbortError') {
                    console.error("Pashto Resume Error:", err);
                }
            });
        }
    } else if (isPlaying && currentAyahIndex === -1) {
      // Start from beginning if playing but no index set
      setCurrentAyahIndex(0);
    }
  }, [isPlaying, currentAyahIndex, data, surahNumber, isBismillahPlaying, volume, isTranslationPlaying]);

  const playAyah = useCallback((index: number) => {
    // This function now just sets the state, the useEffect handles the side effects
    if (index >= visibleCount) setVisibleCount(prev => Math.min(prev + 20, data?.arabicAyahs.length || prev));
    setCurrentAyahIndex(index);
    setIsPlaying(true);
    setIsTranslationPlaying(false);
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
  }, [visibleCount, data]);

  const handleAyahEnd = () => {
    if (isBismillahPlaying) {
        setIsBismillahPlaying(false);
        hasPlayedBismillahRef.current = true;
        playAyah(0);
        return;
    }

    // If in 'both' mode and we just finished Arabic, play Urdu
    if (settings.audioMode === 'both' && !isUrduSpeaking && data && currentAyahIndex !== -1) {
        const urduText = data.tafseerAyahs[currentAyahIndex].text;
        speakUrdu(urduText);
        return;
    }

    // If in 'both-pashto' mode and we just finished Arabic, play Pashto
    if (settings.audioMode === 'both-pashto' && !isTranslationPlaying && data && currentAyahIndex !== -1) {
        const ayah = data.arabicAyahs[currentAyahIndex];
        if (ayah.pashtoAudio) {
            setIsTranslationPlaying(true);
            setActiveWordIndex(-1);
            activeWordIndexRef.current = -1;
            if (audioRef.current) {
                audioRef.current.src = ayah.pashtoAudio;
                audioRef.current.play().catch(err => {
                    console.error("Pashto Audio Error:", err);
                    setIsTranslationPlaying(false);
                    handleAyahEnd(); // Skip to next if failed
                });
            }
            return;
        } else {
            // Fallback to TTS if no audio URL
            const pashtoText = data.pashtoAyahs[currentAyahIndex].text;
            speakPashto(pashtoText);
            return;
        }
    }

    setIsTranslationPlaying(false);
    if (data && currentAyahIndex < data.arabicAyahs.length - 1) {
        setCurrentAyahIndex(prev => prev + 1);
        setActiveWordIndex(-1);
        activeWordIndexRef.current = -1;
    } else {
        setIsPlaying(false);
        setCurrentAyahIndex(-1);
        setActiveWordIndex(-1);
        activeWordIndexRef.current = -1;
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const handleTimeUpdate = () => {
        if (!audio.duration || audio.duration === Infinity || currentAyahIndex === -1 || !data || isTranslationPlaying) return;
        const ayah = data.arabicAyahs[currentAyahIndex];
        
        // Synchronized word splitting with the render logic
        const words = ayah.text.trim().split(/\s+/);
        
        // Calculate total characters to weight word durations
        const totalChars = words.reduce((sum, w) => sum + w.length, 0);
        let elapsedChars = 0;
        let index = 0;
        
        // Slightly adjust ratio to account for silence at the end of audio files
        const durationAdjustment = Math.max(0, audio.duration - 0.4);
        const currentTimeRatio = Math.min(1, audio.currentTime / (durationAdjustment || 1));
        const targetCharCount = currentTimeRatio * totalChars;
        
        for (let i = 0; i < words.length; i++) {
            elapsedChars += words[i].length;
            if (elapsedChars >= targetCharCount) {
                index = i;
                break;
            }
        }
        
        if (index !== activeWordIndexRef.current && index < words.length) {
            activeWordIndexRef.current = index;
            setActiveWordIndex(index);
            
            // Auto-scroll to the active word/ayah if enabled
            if (isAutoScrolling) {
                const wordElement = document.getElementById(`word-${currentAyahIndex}-${index}`);
                const ayahElement = document.getElementById(`ayah-${ayah.numberInSurah}`);
                
                if (wordElement) {
                    wordElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                } else if (ayahElement && index === 0) {
                    ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentAyahIndex, data, isAutoScrolling, isTranslationPlaying]);

  const getThemeClasses = () => {
    switch(settings.theme) {
      case 'dark': return 'bg-gray-900 border-gray-800 text-white';
      case 'sepia': return 'bg-[#fdf6e3] border-[#eee8d5] text-black';
      default: return 'bg-white border-gray-100 text-black';
    }
  };

  const getFontClasses = () => {
    switch(settings.fontSize) {
      case 'sm': return 'text-4xl md:text-5xl';
      case 'lg': return 'text-6xl md:text-7xl';
      case 'xl': return 'text-7xl md:text-8xl';
      case '2xl': return 'text-8xl md:text-9xl';
      default: return 'text-5xl md:text-6xl';
    }
  };

  const getTafseerStyle = () => {
    const base = { fontWeight: '700' };
    switch(settings.tafseerFontSize) {
      case 'sm': return { ...base, fontSize: '1.2rem', lineHeight: '1.8rem' }; 
      case 'base': return { ...base, fontSize: '1.4rem', lineHeight: '2.1rem' };
      case 'lg': return { ...base, fontSize: '1.6rem', lineHeight: '2.4rem' }; 
      case 'xl': return { ...base, fontSize: '1.8rem', lineHeight: '2.7rem' };
      case '2xl': return { ...base, fontSize: '2.2rem', lineHeight: '3.3rem' };
      default: return { ...base, fontSize: '1.6rem', lineHeight: '2.4rem' };
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
            setConsecutiveAudioErrors(prev => prev + 1);
            
            if (consecutiveAudioErrors > 5) {
                setError("Multiple audio playback errors occurred. Please check your internet connection or try a different Surah.");
                setIsPlaying(false);
                return;
            }

            // Fallback Logic: Try everyayah.com if cdn.islamic.network fails
            if (audio && data && currentAyahIndex !== -1) {
                const ayah = data.arabicAyahs[currentAyahIndex];
                const sNum = ayah.surah?.number || surahNumber || 1;
                const aNum = ayah.numberInSurah;
                const surahStr = sNum.toString().padStart(3, '0');
                const ayahStr = aNum.toString().padStart(3, '0');
                const cb = `cb=${Date.now()}`;
                
                // If we haven't tried the fallback yet for this specific ayah
                if (!audio.src.includes('everyayah.com') && !audio.src.includes('quranicaudio.com')) {
                    const fallbackUrl = `https://everyayah.com/data/Alafasy_128kbps/${surahStr}${ayahStr}.mp3?${cb}`;
                    
                    console.log(`Attempting fallback 1: ${fallbackUrl}`);
                    audio.src = fallbackUrl;
                    audio.load();
                    audio.play().catch(err => {
                        console.error("Fallback 1 failed, trying fallback 2", err);
                        // Try fallback 2: quranicaudio.com
                        const fallbackUrl2 = `https://download.quranicaudio.com/quran/mishary_rashid_alafasy/${surahStr}${ayahStr}.mp3?${cb}`;
                        audio.src = fallbackUrl2;
                        audio.load();
                        audio.play().catch(() => handleAyahEnd());
                    });
                } else if (audio.src.includes('everyayah.com')) {
                    // Try fallback 2 if fallback 1 was already tried
                    const fallbackUrl2 = `https://download.quranicaudio.com/quran/mishary_rashid_alafasy/${surahStr}${ayahStr}.mp3?${cb}`;
                    console.log(`Attempting fallback 2: ${fallbackUrl2}`);
                    audio.src = fallbackUrl2;
                    audio.load();
                    audio.play().catch(() => handleAyahEnd());
                } else {
                    // All fallbacks failed, skip
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
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 block text-right">تحریر کا سائز (Font Size)</label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {(['sm', 'base', 'lg', 'xl', '2xl'] as FontSize[]).map(size => (
                                <button 
                                    key={size} 
                                    onClick={() => onUpdateSettings({...settings, fontSize: size})}
                                    className={`py-1.5 rounded-lg font-black uppercase text-[9px] border-2 transition-all ${settings.fontSize === size ? 'border-black bg-black text-white shadow-sm' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                                >
                                    {size}
                                </button>
                            ))}
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
                                className={`py-2 rounded-xl font-bold border-2 transition-all shadow-sm flex items-center justify-center gap-1.5 text-[10px] ${settings.showPashto ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                            >
                                {settings.showPashto ? <BookmarkCheck size={14} /> : <X size={14} />}
                                پشتو (Pashto)
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 block text-right">آڈیو موڈ (Audio Mode)</label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {[
                                { id: 'arabic', label: 'Arabic' },
                                { id: 'urdu', label: 'Urdu' },
                                { id: 'pashto', label: 'Pashto' },
                                { id: 'both', label: 'Ar + Ur' },
                                { id: 'both-pashto', label: 'Ar + Ps' }
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
                        <button 
                            onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.src = BISMILLAH_AUDIO;
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
                            ٹیسٹ آڈیو (Test Audio)
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

         <div className="flex-1 px-6 hidden lg:block">
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                    {currentAyahIndex === -1 ? 'Select an Ayah' : (isBismillahPlaying ? 'Reciting Bismillah' : `Ayah ${currentAyahIndex + 1}`)}
                    {isAudioLoading && ' (Loading...)'}
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest opacity-40">
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

         <div className="flex items-center gap-4 sm:gap-6">
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

      <header ref={headerRef} className={`sticky top-[75px] z-50 px-6 py-5 flex items-center justify-center border-b transition-all duration-300 shadow-lg backdrop-blur-md ${getThemeClasses()}`}>
        <button onClick={onBack} className="p-3 text-black bg-gray-100 hover:bg-gray-200 rounded-2xl active-press transition-all"><ArrowLeft size={24} /></button>
        <div className="text-center">
            <h1 className="font-arabic text-3xl text-black leading-none mb-1 font-bold">
              {juzNumber ? `پارہ ${juzNumber}` : (data as CombinedSurahData)?.surahInfo?.name}
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
              {juzNumber ? `Para ${juzNumber}` : (data as CombinedSurahData)?.surahInfo?.englishName}
            </p>
        </div>
        <div className="flex items-center gap-2">
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
                        <h2 className="font-indopak text-4xl md:text-6xl text-black mb-2" dir="rtl">
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
                        <p className="font-indopak text-4xl md:text-6xl text-black" dir="rtl">
                            {BISMILLAH_TEXT}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">In the name of Allah, the Most Gracious, the Most Merciful</p>
                    </div>
                </div>
            )}

        <div className="space-y-0">
            {data?.arabicAyahs.slice(0, visibleCount).map((ayah, idx) => {
                const tafseerAyah = data.tafseerAyahs?.[idx];
                const isCurrentAyah = currentAyahIndex === idx;
                
                // For Juz, we need to get surah info from the ayah itself if available
                const sNum = ayah.surah?.number || surahNumber;
                const sName = ayah.surah?.englishName;

                const bookmarked = bookmarks.some(b => b.surahNumber === sNum && b.ayahNumber === ayah.numberInSurah);
                const words = ayah.text.trim().split(/\s+/);
                
                return (
                    <div 
                        key={ayah.number} 
                        id={`ayah-${ayah.numberInSurah}`}
                        className={`group relative transition-all duration-300 border-b border-black/5 last:border-0 ${
                            isCurrentAyah ? 'bg-emerald-50/20' : ''
                        }`}
                        style={{ overflow: 'visible' }}
                    >
                        {/* Beautiful Quranic Text Presentation - Continuous Flow */}
                        <div 
                            className={`flex flex-wrap gap-x-0 gap-y-0 p-2 md:p-4 transition-all duration-500 ${
                                isCurrentAyah ? 'bg-emerald-500/5' : ''
                            }`} 
                            dir="rtl"
                        >
                            {words.map((word, wIdx) => {
                                const isWordActive = isCurrentAyah && isPlaying && activeWordIndex === wIdx;
                                return (
                                    <span 
                                        key={wIdx} 
                                        id={`word-${idx}-${wIdx}`}
                                        className={`font-indopak transition-all duration-300 px-1 inline-flex items-center justify-center ${
                                            isWordActive 
                                                ? 'bg-black !text-[#4ade80] shadow-xl z-10 font-bold scale-110 rounded-md' 
                                                : (settings.theme === 'dark' ? 'text-white' : 'text-black')
                                        } ${getFontClasses()}`}
                                        style={{ minWidth: '0.5em' }}
                                    >
                                        {word}
                                    </span>
                                );
                            })}
                            
                            {/* Ayah Number Symbol - Inline with text */}
                            <div className="inline-flex items-center justify-center px-2">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full border border-black/20 font-black text-[10px] transition-all duration-500 ${
                                    isCurrentAyah ? 'bg-black text-white' : 'bg-white text-black/40'
                                }`}>
                                    {ayah.numberInSurah}
                                </div>
                                <button 
                                    onClick={() => toggleBookmark(ayah.numberInSurah, sNum, sName)} 
                                    className={`mr-2 p-1 rounded-md transition-all ${bookmarked ? 'text-gold-600' : 'text-gray-300 hover:text-black'}`}
                                >
                                    <BookmarkIcon size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Compact Translations */}
                        <div className="px-4 pb-2 space-y-1">
                            {settings.showTafseer && tafseerAyah && (
                                <div className="text-right border-r-4 border-black/5 pr-3" dir="rtl">
                                    <p 
                                        className={`font-urdu transition-colors duration-300 ${
                                            settings.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                        }`}
                                        style={getTafseerStyle()}
                                    >
                                        {tafseerAyah.text}
                                    </p>
                                </div>
                            )}

                            {settings.showPashto && data.pashtoAyahs?.[idx] && (
                                <div className="text-right border-r-4 border-emerald-500/10 pr-3" dir="rtl">
                                    <p 
                                        className={`font-urdu transition-colors duration-300 ${
                                            settings.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                        }`}
                                        style={getTafseerStyle()}
                                    >
                                        {data.pashtoAyahs[idx].text}
                                    </p>
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
    </div>
  );
};

export default Reader;