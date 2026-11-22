import React, { useState, useEffect } from 'react';
import {
  Search, Book, Bookmark as BookmarkIcon, Trash2, Info, CheckCircle2,
  WifiOff, Sparkles, Download, CloudDownload, X, Mail, Phone,
  Share2, Check
} from 'lucide-react';
import { Surah, Bookmark, AppSettings } from '../types';
import { getSurahList, downloadQuranData } from '../services/quranApi';
import { dbService } from '../services/db';
import LoadingSpinner from './LoadingSpinner';
import AIChat from './AIChat';
import PWAInstallButton from './PWAInstallButton';
import { PERMANENT_AUTHOR_PHOTO } from '../src/assets/authorPhoto';

interface SurahListProps {
  onSelectSurah: (surahNumber: number, ayahNumber?: number) => void;
  onSelectJuz: (juzNumber: number) => void;
  onGoToAbout: (tab?: 'profile' | 'arabi' | 'seerah') => void;
  settings: AppSettings;
  initialViewMode?: 'surah' | 'juz';
  onViewModeChange?: (mode: 'surah' | 'juz') => void;
}

const SurahList: React.FC<SurahListProps> = ({
  onSelectSurah,
  onSelectJuz,
  onGoToAbout,
  settings,
  initialViewMode,
  onViewModeChange
}) => {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>([]);
  const [viewMode, setViewModeState] = useState<'surah' | 'juz'>(initialViewMode || 'juz');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showChat, setShowChat] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialViewMode) {
      setViewModeState(initialViewMode);
    }
  }, [initialViewMode]);

  const setViewMode = (mode: 'surah' | 'juz') => {
    setViewModeState(mode);
    if (onViewModeChange) onViewModeChange(mode);
  };

  const handleShare = async () => {
    const origin = window.location.origin;
    let shareUrl = origin;
    if (origin.includes('ais-dev-')) {
      shareUrl = origin.replace('ais-dev-', 'ais-pre-');
    }
    shareUrl += window.location.hash;

    const shareData = {
      title: 'Quran Kareem - Urdu Audio',
      text: 'Read and listen to the Holy Quran with Urdu audio translation. A Sadaqah Jariyah project.',
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
    const fetchData = async () => {
      try {
        const list = await getSurahList();
        setSurahs(list);
        setFilteredSurahs(list);

        const bookmarksData = await dbService.getUserData<Bookmark[]>('quran_bookmarks', []);
        setBookmarks(bookmarksData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    const filtered = surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(lowerSearch) ||
        s.englishNameTranslation.toLowerCase().includes(lowerSearch) ||
        s.number.toString().includes(lowerSearch) ||
        s.name.includes(search)
    );
    setFilteredSurahs(filtered);
  }, [search, surahs]);

  const deleteBookmark = (e: React.MouseEvent, ts: number) => {
    e.stopPropagation();
    const updated = bookmarks.filter(b => b.timestamp !== ts);
    setBookmarks(updated);
    dbService.saveUserData('quran_bookmarks', updated).catch(() => {});
  };

  const handleDownload = async () => {
    if (!isOnline) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadCompleted(false);

    try {
      await downloadQuranData(settings.script, (progress) => {
        setDownloadProgress(progress);
      });
      setDownloadCompleted(true);
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {!isOnline && (
        <div className="sticky top-0 z-50 bg-amber-500 text-white text-[10px] py-1 text-center font-bold uppercase tracking-widest flex items-center justify-center">
          <WifiOff size={10} className="mr-1" /> Browsing Offline
        </div>
      )}

      <div className="bg-black text-white pt-6 pb-24 px-6 relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gray-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowChat(true)} className="flex items-center gap-2 bg-white/10 text-emerald-400 hover:text-white hover:bg-white/20 px-4 py-2.5 rounded-2xl transition-all text-xs font-bold border border-white/10 shadow-sm active-press">
                <Sparkles size={16} className="text-gold-400" />
                <span className="hidden sm:inline">AI Scholar</span>
              </button>
              <button onClick={() => setShowDownloadModal(true)} className="flex items-center gap-2 bg-white/10 text-emerald-400 hover:text-white hover:bg-white/20 px-4 py-2.5 rounded-2xl transition-all text-xs font-bold border border-white/10 shadow-sm active-press">
                <CloudDownload size={16} />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-4 py-2.5 rounded-2xl transition-all text-xs font-bold border border-emerald-500/20 shadow-sm active-press">
                {copied ? <Check size={16} /> : <Share2 size={16} />}
                <span>{copied ? 'Copied!' : 'Share'}</span>
              </button>
              <PWAInstallButton variant="header" />
            </div>

            <button
              onClick={() => onGoToAbout('profile')}
              className="flex items-center gap-2 px-4 py-2.5 text-gold-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-2xl border border-white/15 text-xs font-bold active-press"
              title="About App & Author"
            >
              <Info size={16} />
              <span>About</span>
            </button>
          </div>

          <div className="text-center">
            <h1 className="font-arabic text-6xl md:text-7xl mb-4 text-gold-400 drop-shadow-2xl">القرآن الكريم</h1>
            <p className="text-gray-400 text-sm md:text-base font-medium tracking-widest uppercase opacity-80 mb-8">The Holy Quran Urdu Translation</p>

            <div className="relative max-w-xl mx-auto">
              <input
                type="text"
                placeholder={viewMode === 'surah' ? "سورت تلاش کریں (Search Surah...)" : "پارہ تلاش کریں (Search Para...)"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-5 px-8 pr-16 rounded-[2rem] bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-black/10 shadow-2xl transition-all text-right font-urdu text-lg"
                dir="rtl"
              />
              <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-black" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 -mt-12 relative z-20 pb-10 flex flex-col min-h-0">
        {/* Main Dashboard Mode Selector: Surah / Para */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-3xl shadow-xl flex gap-1 border border-white/20">
            <button
              onClick={() => setViewMode('surah')}
              className={`px-6 sm:px-8 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${viewMode === 'surah' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              سورت (Surah)
            </button>
            <button
              onClick={() => setViewMode('juz')}
              className={`px-6 sm:px-8 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${viewMode === 'juz' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              پارہ (Para)
            </button>
          </div>
        </div>

        {bookmarks.length > 0 && !search && (
          <div className="mb-8 flex-shrink-0 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 text-black px-2">
              <BookmarkIcon size={20} className="text-gold-500" fill="currentColor" />
              <h2 className="text-lg font-bold">نشانی (Bookmarks)</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
              {bookmarks.map((b) => (
                <div key={b.timestamp} onClick={() => onSelectSurah(b.surahNumber, b.ayahNumber)} className="flex-shrink-0 w-52 bg-white border border-gold-200 hover:border-gold-500 rounded-3xl p-5 shadow-lg transition-all cursor-pointer group active-press">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black bg-gold-50 text-gold-700 px-2.5 py-1 rounded-lg uppercase tracking-wider">Ayah {b.ayahNumber}</span>
                    <button onClick={(e) => deleteBookmark(e, b.timestamp)} className="p-1.5 text-gray-300 hover:text-red-500 bg-gray-50 rounded-full"><Trash2 size={16} /></button>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base truncate">{b.surahName}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col min-h-0">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
            <div className="flex items-center gap-3 text-black">
              <Book size={24} className="text-black" />
              <h2 className="text-xl font-bold">
                {viewMode === 'surah' ? 'سورت انڈیکس' : 'پارہ انڈیکس'}
              </h2>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
              {viewMode === 'surah' ? `${filteredSurahs.length} Chapters` : '30 Paras'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {loading ? (
              <LoadingSpinner />
            ) : viewMode === 'surah' ? (
              filteredSurahs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredSurahs.map((surah) => (
                    <div
                      key={surah.number}
                      onClick={() => onSelectSurah(surah.number)}
                      className="bg-white hover:bg-gray-50 border border-gray-100 hover:border-black/10 rounded-[1.5rem] p-4 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex items-center justify-between min-h-[90px] active-press surah-card"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 relative flex items-center justify-center flex-shrink-0">
                          <div className="absolute inset-0 bg-gray-100 rounded-2xl transform rotate-45 group-hover:rotate-90 group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-sm"></div>
                          <span className="relative font-black text-black group-hover:text-white text-xs transition-colors">{surah.number}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-800 group-hover:text-black text-base truncate transition-colors leading-tight mb-1">
                            {surah.englishName}
                          </h3>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight truncate opacity-80 group-hover:opacity-100 transition-opacity">
                            {surah.englishNameTranslation}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <h3 className="font-arabic font-alqalam text-xl text-black mb-0.5 group-hover:scale-105 transition-transform origin-right" style={{ fontFamily: "'Al Qalam Quran Majeed', 'AlQalamQuranMajeed', serif" }}>{surah.name}</h3>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{surah.numberOfAyahs} Ayat</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Search size={64} className="mb-6 opacity-10" />
                  <p className="text-xl font-medium">No results found for "{search}"</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 30 }, (_, i) => i + 1)
                  .filter(num => !search || num.toString().includes(search))
                  .map((num) => (
                    <div
                      key={num}
                      onClick={() => onSelectJuz(num)}
                      className="bg-white hover:bg-gray-50 border border-gray-100 hover:border-black/10 rounded-[1.5rem] p-4 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex items-center justify-between min-h-[90px] active-press surah-card"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 relative flex items-center justify-center flex-shrink-0">
                          <div className="absolute inset-0 bg-gray-100 rounded-2xl transform rotate-45 group-hover:rotate-90 group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-sm"></div>
                          <span className="relative font-black text-black group-hover:text-white text-xs transition-colors">{num}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-800 group-hover:text-black text-base truncate transition-colors leading-tight mb-1">
                            Para {num}
                          </h3>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight truncate opacity-80 group-hover:opacity-100 transition-opacity">
                            Juz {num}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <h3 className="font-arabic font-alqalam text-xl text-black mb-0.5 group-hover:scale-105 transition-transform origin-right" style={{ fontFamily: "'Al Qalam Quran Majeed', 'AlQalamQuranMajeed', serif" }}>پارہ {num}</h3>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* VISIBLE AUTHOR INFORMATION SECTION */}
            {!loading && !search && (
              <div className="mt-16 p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-24 h-24 bg-white rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-black/10 flex-shrink-0">
                    <img
                      src={PERMANENT_AUTHOR_PHOTO}
                      alt="Abdul Rasheed"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full h-full object-cover select-none"
                    />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Author & Developer</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Developed with dedication by <strong>Abdul Rasheed</strong>, an Educationist and Full-Stack Web Developer.
                      This project is a labor of love dedicated as a Sadaqah Jariyah.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <a href="mailto:rasheedpsh2023@gmail.com" className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-sm font-bold border border-gray-100 shadow-sm hover:shadow-md transition-all active-press">
                        <Mail size={16} /> <span dir="ltr">rasheedpsh2023@gmail.com</span>
                      </a>
                      <a href="tel:+923339849098" className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-sm font-bold border border-gray-100 shadow-sm hover:shadow-md transition-all active-press">
                        <Phone size={16} /> <span dir="ltr">+92 333 9849098</span>
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => onGoToAbout('profile')}
                    className="px-8 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-gray-900 transition-all active-press"
                  >
                    About App & Author
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDownloadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isDownloading && setShowDownloadModal(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-white">
            <div className="bg-black p-8 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex justify-between items-center relative z-10">
                <h3 className="text-2xl font-bold flex items-center">
                  <Download size={28} className="mr-3" /> Offline Sync
                </h3>
                {!isDownloading && (
                  <button onClick={() => setShowDownloadModal(false)} className="hover:bg-white/10 p-2 rounded-2xl transition-all">
                    <X size={24} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-10">
              {downloadCompleted ? (
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-black shadow-inner">
                    <CheckCircle2 size={40} />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-800 mb-2">Sync Complete</h4>
                  <p className="text-gray-500 text-sm mb-8">Quran text and Urdu translations are now stored locally.</p>
                  <button onClick={() => setShowDownloadModal(false)} className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-900 transition-all w-full shadow-lg active-press">
                    Done
                  </button>
                </div>
              ) : isDownloading ? (
                <div className="text-center">
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden border border-gray-100">
                    <div className="bg-black h-full transition-all duration-300" style={{ width: `${downloadProgress}%` }}></div>
                  </div>
                  <h4 className="text-3xl font-black text-black mb-2">{downloadProgress}%</h4>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Caching Holy Verses...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="p-6 bg-gray-50 rounded-3xl mb-8 border border-gray-100 text-gray-900 text-sm font-medium leading-relaxed">
                    This will store all 114 Surahs (Text, Urdu Translation, and Tafseer) on your device (~25MB).
                  </div>
                  <button
                    onClick={handleDownload}
                    disabled={!isOnline}
                    className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-900 transition-all w-full flex items-center justify-center shadow-lg disabled:opacity-50 active-press"
                  >
                    <CloudDownload size={24} className="mr-3" />
                    {isOnline ? 'Download Now' : 'Connect to Internet'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AIChat context="User is browsing Surah Index" isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
};

export default SurahList;