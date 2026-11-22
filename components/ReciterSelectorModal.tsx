import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Volume2, Square, Check, Headphones, Loader2 } from 'lucide-react';
import {
  QURAN_RECITERS,
  RECITER_CATEGORIES,
  ReciterCategory,
  ReciterInfo,
  getReciterAudioUrl,
} from '../services/reciters';
import { ThemeType } from '../types';

interface ReciterSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciterId?: string;
  onSelectReciter: (reciterId: string) => void;
  theme?: ThemeType;
}

const ReciterSelectorModal: React.FC<ReciterSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedReciterId = 'alafasy',
  onSelectReciter,
  theme = 'paper',
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | ReciterCategory>('all');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
    }
    setPreviewingId(null);
    setPreviewLoadingId(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopPreview();
    }
    return () => {
      stopPreview();
    };
  }, [isOpen]);

  const handleTogglePreview = (e: React.MouseEvent, reciter: ReciterInfo) => {
    e.stopPropagation();

    if (previewingId === reciter.id || previewLoadingId === reciter.id) {
      stopPreview();
      return;
    }

    stopPreview();

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }

    const audio = previewAudioRef.current;
    setPreviewLoadingId(reciter.id);
    // Surah Al-Fatihah Ayah 1 (Bismillah) for quick crisp preview
    audio.src = getReciterAudioUrl(reciter.id, 1, 1);

    audio.onplaying = () => {
      setPreviewLoadingId(null);
      setPreviewingId(reciter.id);
    };
    audio.onended = () => {
      setPreviewingId(null);
      setPreviewLoadingId(null);
    };
    audio.onerror = () => {
      setPreviewingId(null);
      setPreviewLoadingId(null);
    };

    audio.play().catch(() => {
      setPreviewingId(null);
      setPreviewLoadingId(null);
    });
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: QURAN_RECITERS.length };
    for (const r of QURAN_RECITERS) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredReciters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return QURAN_RECITERS.filter((r) => {
      const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.arabicName.includes(search.trim()) ||
        r.country.toLowerCase().includes(q) ||
        r.style.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const getStyleBadgeColor = (style: ReciterInfo['style']) => {
    switch (style) {
      case 'Haramain':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25';
      case 'Mujawwad':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25';
      case 'Teaching':
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25';
      case 'Warsh':
        return 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25';
      default:
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={() => {
          stopPreview();
          onClose();
        }}
      />

      <div
        className={`relative z-10 w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl border flex flex-col overflow-hidden transition-colors ${
          isDark
            ? 'bg-gray-900 border-gray-800 text-white'
            : isSepia
              ? 'bg-[#fdf6e3] border-[#e6dec3] text-[#433422]'
              : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-5 border-b flex items-center justify-between gap-4 ${
            isDark ? 'bg-gray-950/70 border-gray-800' : isSepia ? 'bg-[#f4ecd8] border-[#e6dec3]' : 'bg-gray-50 border-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg flex-shrink-0">
              <Headphones size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black leading-tight">
                Select Quran Reciter ({QURAN_RECITERS.length})
              </h2>
              <p className="text-xs opacity-65 font-urdu" dir="rtl">
                تمام عالمِ اسلام کے بہترین قراء کرام کا انتخاب کریں
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className={`p-2.5 rounded-2xl transition-colors ${
              isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-black/5 hover:bg-black/10 text-gray-700'
            }`}
            aria-label="Close reciter selector"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search + Category Tabs */}
        <div
          className={`px-6 pt-4 pb-3 border-b space-y-3 ${
            isDark ? 'border-gray-800' : isSepia ? 'border-[#e6dec3]' : 'border-gray-100'
          }`}
        >
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Qari by name, Makkah, Madinah, Egypt, Mujawwad, Teaching, Warsh..."
              className={`w-full pl-11 pr-10 py-3 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                  : isSepia
                    ? 'bg-white/80 border-[#ddd3b6] text-[#433422] placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-50 hover:opacity-100"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {RECITER_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : isDark
                        ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-750'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-black/5 opacity-70'}`}>
                    {categoryCounts[cat.id] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reciter Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {filteredReciters.length === 0 ? (
            <div className="py-16 text-center opacity-60">
              <Headphones size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No reciter matched "{search}"</p>
              <button
                onClick={() => {
                  setSearch('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-xs font-bold text-emerald-600 underline"
              >
                Show all {QURAN_RECITERS.length} reciters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredReciters.map((reciter) => {
                const isSelected = selectedReciterId === reciter.id;
                const isPreviewing = previewingId === reciter.id;
                const isPreviewLoading = previewLoadingId === reciter.id;

                return (
                  <div
                    key={reciter.id}
                    onClick={() => {
                      stopPreview();
                      onSelectReciter(reciter.id);
                      onClose();
                    }}
                    className={`group rounded-2xl p-4 border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? isDark
                          ? 'border-emerald-500 bg-emerald-950/40 shadow-lg'
                          : 'border-emerald-600 bg-emerald-50/70 shadow-lg'
                        : isDark
                          ? 'border-gray-800 bg-gray-800/50 hover:border-gray-600'
                          : isSepia
                            ? 'border-[#e6dec3] bg-white/70 hover:border-[#b5a785]'
                            : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getStyleBadgeColor(reciter.style)}`}>
                            {reciter.style}
                          </span>
                          <span className="text-[10px] font-bold opacity-55">
                            {reciter.country} • {reciter.bitrate}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-sm sm:text-base leading-snug">
                          {reciter.name}
                        </h3>
                        <p className="font-arabic text-base sm:text-lg text-emerald-700 dark:text-emerald-400 font-bold mt-0.5" dir="rtl">
                          {reciter.arabicName}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePreview(e, reciter)}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                            isPreviewing
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : isDark
                                ? 'bg-gray-900 border-gray-700 text-gray-300 hover:border-emerald-500'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                          }`}
                          title={isPreviewing ? 'Stop preview' : 'Preview Bismillah audio'}
                        >
                          {isPreviewLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isPreviewing ? (
                            <Square size={14} fill="currentColor" />
                          ) : (
                            <Volume2 size={14} />
                          )}
                          <span className="text-[10px]">{isPreviewing ? 'Stop' : 'Sample'}</span>
                        </button>

                        {isSelected && (
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                            <Check size={16} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed">
                      {reciter.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReciterSelectorModal;
