import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div 
        id="pwa-reconnected-toast"
        className="fixed bottom-5 left-5 z-[110] flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-fade-in"
        dir="ltr"
      >
        <Wifi size={16} />
        <span>Back Online — Service worker active</span>
      </div>
    );
  }

  return (
    <div 
      id="pwa-offline-badge"
      className="fixed bottom-5 left-5 z-[110] flex items-center gap-2.5 rounded-2xl bg-black/90 dark:bg-white/95 text-white dark:text-black px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md border border-white/20 dark:border-black/10 animate-fade-in"
      dir="ltr"
    >
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
      <WifiOff size={14} className="text-amber-400" />
      <span>Offline Mode — All loaded Quran content is cached</span>
    </div>
  );
};

export default OfflineIndicator;
