import React from 'react';
import { ArrowLeft, User, Mail, Phone, ExternalLink, ShieldCheck, Heart } from 'lucide-react';

interface AboutAuthorProps {
  onBack: () => void;
}

const AboutAuthor: React.FC<AboutAuthorProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* Header - Stays dark so emerald is allowed */}
      <div className="bg-black text-white pt-12 pb-24 px-6 relative overflow-hidden border-b border-gray-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-900 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <button 
            onClick={onBack}
            className="absolute top-0 left-0 p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">مصنف کے بارے میں</h1>
          <p className="text-gray-400 text-lg font-light">About the Author</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="h-2 bg-black"></div>
          
          <div className="p-8 md:p-12 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100">
              <User size={48} className="text-black" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Abdul Rasheed</h2>
            <p className="text-gray-500 font-medium mb-8">An Educationist and Web Developer</p>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 transition-transform hover:scale-[1.02]">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-black shadow-sm mr-4 border border-gray-100">
                  <Mail size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Email Address</p>
                  <p className="text-gray-800 font-medium" dir="ltr">rasheedpsh2023@gmail.com</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 transition-transform hover:scale-[1.02]">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-black shadow-sm mr-4 border border-gray-100">
                  <Phone size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Cell Phone</p>
                  <p className="text-gray-800 font-medium inline-block" dir="ltr">+92 333 9849098</p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 text-left">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <ShieldCheck size={20} className="text-black mr-2" />
                Project Mission
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                This application was developed with the intention of making the Holy Quran more accessible to Urdu-speaking audiences worldwide. By combining traditional scripts with modern AI technology, we aim to provide deeper insights into the word of Allah (SWT).
              </p>
              <div className="bg-gray-50 p-4 rounded-lg flex items-start border border-gray-100">
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
        
        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Quran-e-Kareem 2026 Project</p>
        </div>
      </div>
    </div>
  );
};

export default AboutAuthor;