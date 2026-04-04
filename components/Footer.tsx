import React from 'react';
import { Mail, Phone, Book, Info, Heart, ArrowUpRight, User, Share2, Check } from 'lucide-react';

interface FooterProps {
  onGoToHome: () => void;
  onGoToAbout: () => void;
}

const Footer: React.FC<FooterProps> = ({ onGoToHome, onGoToAbout }) => {
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    const origin = window.location.origin;
    let shareUrl = origin;
    if (origin.includes('ais-dev-')) {
      shareUrl = origin.replace('ais-dev-', 'ais-pre-');
    }
    // Include the current hash so users land on the same page
    shareUrl += window.location.hash;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <footer className="bg-black text-gray-400 py-10 border-t border-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/islamic-art.png')` }}></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
          
          {/* Brand & Stats */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="font-arabic text-4xl text-gold-400 mb-3 drop-shadow-sm">القرآن کریم</h2>
            <p className="text-gray-500 text-xs leading-relaxed mb-4 max-w-xs">
              Modern digital Quran with Urdu translation and Tafseer.
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 rounded-full border border-gray-800">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Ver 2026.1.0</span>
            </div>
          </div>

          {/* Author Summary - Fitting the screen better */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
                <User size={18} className="text-gold-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-base leading-tight">Abdul Rasheed</p>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter">Developer & Educationist</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
                <a href="tel:+923339849098" className="flex items-center justify-between px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 transition-all text-xs group">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-emerald-500 group-hover:text-gold-400" />
                    <span dir="ltr" className="text-gray-200">+92 333 9849098</span>
                  </div>
                </a>
                <a href="mailto:rasheedpsh2023@gmail.com" className="flex items-center justify-between px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 transition-all text-xs group">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-emerald-500 group-hover:text-gold-400" />
                    <span dir="ltr" className="text-gray-200">rasheedpsh2023@gmail.com</span>
                  </div>
                </a>
            </div>
          </div>

          {/* Compact Links */}
          <div className="flex flex-col items-center md:items-end gap-3">
              <button 
                onClick={onGoToHome}
                className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors group"
              >
                <Book size={16} className="text-emerald-500 group-hover:text-gold-400" />
                <span>Surah Index</span>
                <ArrowUpRight size={14} className="opacity-40" />
              </button>
              
              <button 
                onClick={onGoToAbout}
                className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors group"
              >
                <Info size={16} className="text-emerald-500 group-hover:text-gold-400" />
                <span>Full Developer Bio</span>
                <ArrowUpRight size={14} className="opacity-40" />
              </button>

              <button 
                onClick={handleShare}
                className="flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors group mt-2 px-4 py-2 bg-emerald-950/30 rounded-full border border-emerald-900/50"
              >
                {copied ? <Check size={16} /> : <Share2 size={16} />}
                <span>{copied ? 'Link Copied!' : 'Share App Link'}</span>
              </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-gray-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
            &copy; {new Date().getFullYear()} Quran-e-Kareem 2026.
          </p>
          
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800/50">
            <span>Sadaqah Jariyah by Abdul Rasheed</span>
            <Heart size={10} className="text-red-500 ml-1 animate-pulse" fill="currentColor" />
          </div>

          <div className="flex gap-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 hover:text-gold-400 transition-colors cursor-pointer">Privacy</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 hover:text-gold-400 transition-colors cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;