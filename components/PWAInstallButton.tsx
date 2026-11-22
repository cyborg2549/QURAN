import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Check, ArrowDownToLine } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'badge' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowInfoModal(true);
    }
  };

  return (
    <>
      <button
        id="pwa-install-header-btn"
        onClick={handleInstallClick}
        aria-label="Install Quran Kareem App"
        title="Install Quran Kareem as an offline PWA"
        className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl transition-all text-xs font-bold shadow-sm active-press border ${
          variant === 'header'
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-white border-emerald-500/30'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-500'
        } ${className}`}
      >
        <ArrowDownToLine size={16} className="text-emerald-400" />
        <span className="inline">Install App</span>
      </button>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 relative text-left"
            dir="ltr"
          >
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full bg-gray-100 dark:bg-gray-800"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
              <Smartphone size={24} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Install on iPhone & iPad
            </h3>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              Install Quran Kareem on your home screen for high-speed offline access and fullscreen reading:
            </p>

            <div className="space-y-3.5 mb-6 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                  <Share size={18} />
                </div>
                <div>
                  <div className="font-semibold text-xs">Step 1</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Tap the <strong>Share</strong> button in Safari's bottom toolbar.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                  <PlusSquare size={18} />
                </div>
                <div>
                  <div className="font-semibold text-xs">Step 2</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider transition-all hover:opacity-90"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Desktop / Generic Browser Help Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 relative text-left"
            dir="ltr"
          >
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full bg-gray-100 dark:bg-gray-800"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
              <Download size={24} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Install Quran Kareem PWA
            </h3>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              This application is configured with offline Workbox caching and auto-updating service workers.
            </p>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 space-y-2 mb-5">
              <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" />
                Browser Address Bar:
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Click the <strong>Install</strong> icon (computer with down arrow) directly in your browser's address bar or Chrome menu (⋮) &rarr; <strong>Install Quran Kareem</strong>.
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider transition-all hover:opacity-90"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {installedSuccess && (
        <div className="fixed top-5 right-5 z-[130] flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl animate-fade-in text-xs font-bold">
          <Check size={16} />
          <span>Quran Kareem installed successfully!</span>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;
