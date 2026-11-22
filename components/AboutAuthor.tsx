import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, User, Mail, Phone, ExternalLink, ShieldCheck, Heart,
  BookOpen, Scroll, Lock, KeyRound, Camera, RotateCcw,
  Book, Volume2, WifiOff, Sparkles, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { BuiltInAppViewer } from './BuiltInAppViewer';
import { PERMANENT_AUTHOR_PHOTO } from '../src/assets/authorPhoto';

export type AccountTab = 'profile' | 'arabi' | 'seerah';

interface AboutAuthorProps {
  onBack: () => void;
  activeTab?: AccountTab;
  onTabChange?: (tab: AccountTab) => void;
}

interface AppInfo {
  id: 'arabi' | 'seerah';
  name: string;
  nameUrdu: string;
  defaultUrl: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const APPS_LIST: AppInfo[] = [
  {
    id: 'arabi',
    name: 'Aaiye Arabi Seekhein - Turkish Border Reader',
    nameUrdu: 'آئیے عربی سیکھیں - ترکش بارڈر ریڈر',
    defaultUrl: '',
    icon: BookOpen,
    color: 'emerald'
  },
  {
    id: 'seerah',
    name: 'Complete Seerah of the Holy Prophet Muhammad (PBUH)',
    nameUrdu: 'سیرت النبی ﷺ مکمل',
    defaultUrl: '',
    icon: Scroll,
    color: 'amber'
  }
];

const AboutAuthor: React.FC<AboutAuthorProps> = ({
  onBack,
  activeTab: externalTab,
  onTabChange
}) => {
  const [tab, setTab] = useState<AccountTab>(externalTab || 'profile');
  const [appLinks, setAppLinks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('user_account_app_links');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleaned: Record<string, string> = {};
        for (const k in parsed) {
          if (parsed[k] && !parsed[k].includes('.web.app')) {
            cleaned[k] = parsed[k];
          }
        }
        return cleaned;
      }
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
    return {};
  });

  // Author Photo state: always starts with the permanently embedded photo
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [verifyingPasskey, setVerifyingPasskey] = useState(false);
  const [photoStatusMsg, setPhotoStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayedPhoto = customPhotoUrl || PERMANENT_AUTHOR_PHOTO;
  const isUnlocked = Boolean(unlockToken);

  useEffect(() => {
    if (externalTab) {
      setTab(externalTab);
    }
  }, [externalTab]);

  useEffect(() => {
    let active = true;
    fetch('/api/about-photo')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.customPhotoUrl === 'string') {
          setCustomPhotoUrl(data.customPhotoUrl);
        }
      })
      .catch(() => {
        // Offline or unreachable: permanently embedded photo remains active
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectTab = (selectedTab: AccountTab) => {
    setTab(selectedTab);
    if (onTabChange) {
      onTabChange(selectedTab);
    }
  };

  const handleSaveAppUrl = (url: string) => {
    if (tab === 'profile') return;
    const cleanUrl = url && !url.includes('.web.app') ? url : '';
    const updated = { ...appLinks, [tab]: cleanUrl };
    setAppLinks(updated);
    try {
      localStorage.setItem('user_account_app_links', JSON.stringify(updated));
    } catch (e) {
      console.warn('Save error', e);
    }
  };

  // Intercept any attempt to change/replace the picture without passkey verification
  const handleAttemptChangePicture = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!unlockToken) {
      setPasskeyInput('');
      setPasskeyError(null);
      setShowPasskeyModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleVerifyPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyInput.trim()) {
      setPasskeyError('Please enter the owner passkey.');
      return;
    }
    setVerifyingPasskey(true);
    setPasskeyError(null);

    try {
      const res = await fetch('/api/verify-about-passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: passkeyInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.verified || !data.token) {
        setPasskeyError(data.error || 'Incorrect passkey. Picture remains locked.');
        return;
      }
      setUnlockToken(data.token);
      setShowPasskeyModal(false);
      setPasskeyInput('');
      setPhotoStatusMsg('Passkey verified. You can now change or restore the picture.');
      setTimeout(() => setPhotoStatusMsg(null), 5000);
    } catch {
      setPasskeyError('Unable to verify passkey right now. Picture remains locked.');
    } finally {
      setVerifyingPasskey(false);
    }
  };

  const handlePhotoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !unlockToken) {
      if (!unlockToken) setShowPasskeyModal(true);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoStatusMsg('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoStatusMsg('Image must be smaller than 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      try {
        const res = await fetch('/api/about-photo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${unlockToken}`,
          },
          body: JSON.stringify({ photoDataUrl: dataUrl }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 403) {
            setUnlockToken(null);
            setShowPasskeyModal(true);
          }
          setPhotoStatusMsg(err.error || 'Passkey verification expired.');
          return;
        }
        const result = await res.json();
        setCustomPhotoUrl(result.customPhotoUrl);
        setPhotoStatusMsg('Author picture updated securely.');
        setTimeout(() => setPhotoStatusMsg(null), 4000);
      } catch {
        setPhotoStatusMsg('Could not update picture. Embedded photo preserved.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRestorePermanentPhoto = async () => {
    if (!unlockToken) {
      setShowPasskeyModal(true);
      return;
    }
    try {
      const res = await fetch('/api/about-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${unlockToken}`,
        },
        body: JSON.stringify({ photoDataUrl: null }),
      });
      if (res.ok) {
        setCustomPhotoUrl(null);
        setPhotoStatusMsg('Restored permanently embedded author picture.');
        setTimeout(() => setPhotoStatusMsg(null), 4000);
      } else if (res.status === 403) {
        setUnlockToken(null);
        setShowPasskeyModal(true);
      }
    } catch {
      setPhotoStatusMsg('Could not restore right now.');
    }
  };

  const handleLockPhoto = () => {
    setUnlockToken(null);
    setPhotoStatusMsg('Picture locked with passkey protection.');
    setTimeout(() => setPhotoStatusMsg(null), 3500);
  };

  return (
    <div className="min-h-screen bg-paper pb-20 flex flex-col">
      {/* Header with Navigation and Clickable Tabs */}
      <div className="bg-black text-white pt-6 pb-12 px-4 sm:px-6 relative overflow-hidden border-b border-gray-800 flex-shrink-0">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={22} />
              <span className="text-sm font-semibold">Back to Quran</span>
            </button>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gold-400 bg-gold-400/10 px-3 py-1 rounded-full border border-gold-400/20">
                Abdul Rasheed • About App
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">ایپ اور مصنف کے بارے میں</h1>
            <p className="text-gray-400 text-sm">About Quran-e-Kareem AI & Author</p>
          </div>

          {/* Clickable Tabs */}
          <div className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl flex flex-wrap gap-1 border border-white/15 max-w-4xl justify-center shadow-lg">
              <button
                onClick={() => handleSelectTab('profile')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  tab === 'profile'
                    ? 'bg-white text-black shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <User size={16} />
                <span>About App & Author (تعارف)</span>
              </button>

              <button
                onClick={() => handleSelectTab('arabi')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  tab === 'arabi'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <BookOpen size={16} />
                <span>Aaiye Arabi Seekhein</span>
              </button>

              <button
                onClick={() => handleSelectTab('seerah')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  tab === 'seerah'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Scroll size={16} />
                <span>Complete Seerah (PBUH)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-20 w-full flex-1 flex flex-col">
        {/* TAB 1: About App & Author View */}
        {tab === 'profile' && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 mb-8">
            <div className="h-2 bg-black"></div>

            <div className="p-6 sm:p-10 md:p-12 text-center">
              {/* Permanently Embedded & Passkey-Protected Author Portrait */}
              <div
                className="relative inline-block mb-4"
                onDrop={handleAttemptChangePicture}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden mx-auto shadow-xl border-4 border-gold-400/50 flex items-center justify-center bg-white relative select-none">
                  <img
                    src={displayedPhoto}
                    alt="Abdul Rasheed"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md border ${
                    isUnlocked
                      ? 'bg-amber-500 text-black border-amber-300'
                      : 'bg-black text-gold-400 border-gold-400/40'
                  }`}
                  title={isUnlocked ? 'Unlocked for owner editing' : 'Protected by owner passkey'}
                >
                  <Lock size={11} />
                  <span>{isUnlocked ? 'Unlocked' : 'Protected'}</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Abdul Rasheed</h2>
              <p className="text-gray-500 font-medium mb-4">Educationist & Full-Stack Web Developer</p>

              {/* Picture Protection Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={handleAttemptChangePicture}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition-all active-press"
                >
                  {isUnlocked ? <Camera size={14} className="text-gold-400" /> : <KeyRound size={14} className="text-gold-400" />}
                  <span>{isUnlocked ? 'Upload New Picture' : 'Change Picture (Passkey Required)'}</span>
                </button>

                {isUnlocked && customPhotoUrl && (
                  <button
                    type="button"
                    onClick={handleRestorePermanentPhoto}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all active-press"
                  >
                    <RotateCcw size={13} />
                    <span>Restore Embedded Photo</span>
                  </button>
                )}

                {isUnlocked && (
                  <button
                    type="button"
                    onClick={handleLockPhoto}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all active-press"
                  >
                    <Lock size={13} />
                    <span>Lock Picture</span>
                  </button>
                )}

                {/* File input is ONLY mounted when passkey verification has succeeded */}
                {isUnlocked && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoFileSelected}
                    className="hidden"
                  />
                )}
              </div>

              {photoStatusMsg && (
                <div className="max-w-md mx-auto mb-6 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>{photoStatusMsg}</span>
                </div>
              )}

              {/* About This App Section */}
              <div className="mb-10 p-6 sm:p-8 bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white rounded-3xl text-left shadow-xl border border-gold-500/20">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gold-400 bg-gold-400/10 px-3 py-1 rounded-full border border-gold-400/20">
                      About This Application • Ver 2026.1.0
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-3">
                      Quran-e-Kareem AI — The Holy Quran with Urdu
                    </h3>
                  </div>
                  <p className="font-arabic text-3xl text-gold-400">القرآن الكريم</p>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-6">
                  Designed and developed as an ongoing <strong>Sadaqah Jariyah</strong> by Abdul Rasheed, this digital Quran platform brings together authentic Quranic calligraphy, scholarly Urdu translation and Tafseer, multilingual audio recitations, and offline reading support in one fast, distraction-free application.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <Book size={18} className="text-gold-400 mb-2" />
                    <h4 className="font-bold text-white text-xs mb-1">114 Surahs & 30 Paras</h4>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Authentic IndoPak (Al Qalam Quran Majeed) & Uthmani scripts with adjustable typography.
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <Volume2 size={18} className="text-emerald-400 mb-2" />
                    <h4 className="font-bold text-white text-xs mb-1">Audio & Translations</h4>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Synchronized Arabic recitation with Urdu audio and Maulana Maududi Tafheem-ul-Quran.
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <Sparkles size={18} className="text-amber-400 mb-2" />
                    <h4 className="font-bold text-white text-xs mb-1">AI Islamic Scholar</h4>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Interactive Urdu & English Q&A for Surah introductions, context, and verse insights.
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <WifiOff size={18} className="text-blue-400 mb-2" />
                    <h4 className="font-bold text-white text-xs mb-1">Offline PWA Ready</h4>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Installable app with local IndexedDB sync so you can read anywhere without internet.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                <div className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-transform hover:scale-[1.01]">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black shadow-sm mr-4 border border-gray-100">
                    <Mail size={20} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Email Address</p>
                    <a href="mailto:rasheedpsh2023@gmail.com" className="text-gray-800 font-semibold text-sm hover:underline truncate block" dir="ltr">
                      rasheedpsh2023@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-transform hover:scale-[1.01]">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black shadow-sm mr-4 border border-gray-100">
                    <Phone size={20} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Cell Phone</p>
                    <a href="tel:+923339849098" className="text-gray-800 font-semibold text-sm inline-block hover:underline" dir="ltr">
                      +92 333 9849098
                    </a>
                  </div>
                </div>
              </div>

              {/* Built-In Companion Tools */}
              <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 max-w-2xl mx-auto text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Companion Islamic Learning Tools:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {APPS_LIST.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleSelectTab(app.id)}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-black text-left transition-all hover:shadow-sm group active-press"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <app.icon size={16} className="text-gray-600 group-hover:text-black flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-800 group-hover:text-black truncate">
                          {app.name.split('-')[0].trim()}
                        </span>
                      </div>
                      <ExternalLink size={14} className="text-gray-400 group-hover:text-black flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 text-left">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <ShieldCheck size={20} className="text-black mr-2" />
                  Project Mission
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                  This application was developed with the intention of making the Holy Quran more accessible to Urdu-speaking audiences worldwide. By combining traditional scripts with modern AI technology, we aim to provide deeper insights into the word of Allah (SWT).
                </p>
                <div className="bg-gray-50 p-4 rounded-xl flex items-start border border-gray-100">
                  <Heart size={20} className="text-red-500 mr-3 mt-1 flex-shrink-0" fill="currentColor" />
                  <p className="text-sm text-gray-800 italic">
                    "The best among you are those who learn the Quran and teach it."
                    <br />
                    <span className="font-bold">— Sahih Al-Bukhari</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2, 3, 4: Built-in companion modules */}
        {tab !== 'profile' && (
          <BuiltInAppViewer
            appId={tab as any}
            savedUrl={appLinks[tab]}
            onSaveUrl={handleSaveAppUrl}
            onBackToProfile={() => handleSelectTab('profile')}
          />
        )}

        <div className="text-center text-gray-400 text-xs pb-4">
          <p>&copy; {new Date().getFullYear()} Quran-e-Kareem 2026 • Abdul Rasheed</p>
        </div>
      </div>

      {/* PASSKEY VERIFICATION MODAL */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowPasskeyModal(false)}
          ></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-gray-100">
            <div className="bg-black text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-400/20 text-gold-400 flex items-center justify-center border border-gold-400/30">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Passkey Required</h3>
                  <p className="text-[11px] text-gray-400">Author Picture Protection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasskeyModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVerifyPasskey} className="p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                This embedded picture of <strong>Abdul Rasheed</strong> is permanently protected. Enter the owner passkey to change or restore it.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Owner Passkey:
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Enter passkey..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {passkeyError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{passkeyError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={verifyingPasskey}
                  className="flex-1 py-3 bg-black hover:bg-gray-900 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-60 active-press"
                >
                  {verifyingPasskey ? 'Verifying...' : 'Verify Passkey'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasskeyModal(false)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutAuthor;
