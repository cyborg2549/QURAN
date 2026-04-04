import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { askIslamicScholar } from '../services/geminiService';
import { ChatMessage } from '../types';

interface AIChatProps {
  context?: string; // Current Surah context
  isOpen: boolean;
  onClose: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ context, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'السلام علیکم! میں آپ کا قرآن اسسٹنٹ ہوں۔ آپ کسی بھی آیت یا سورت کے بارے میں سوال پوچھ سکتے ہیں۔ (Assalam-o-Alaikum! I am your Quran Assistant. You can ask about any Ayah or Surah.)',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);

  const speak = (text: string, id: string) => {
    if (isSpeaking === id) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    
    // Clean text for better speech (remove emojis, special characters if needed)
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Function to set voice
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prioritize Urdu, then Hindi (often similar enough for basic Urdu), then others
      const urduVoice = voices.find(v => v.lang.toLowerCase().includes('ur')) || 
                        voices.find(v => v.lang.toLowerCase().includes('hi'));
      
      if (urduVoice) {
        utterance.voice = urduVoice;
        utterance.rate = 0.9; // Slightly slower for better clarity
      }
    };

    setVoice();
    
    // If voices aren't loaded yet, they might load later
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }
    
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = (event) => {
      console.error("SpeechSynthesis Error:", event);
      setIsSpeaking(null);
    };
    
    setIsSpeaking(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await askIslamicScholar(userMessage.text, context);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'معذرت، کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Overlay for mobile to close when clicking outside */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
        ></div>
      )}

      {/* Chat Window */}
      <div
        className={`fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-96 bg-white md:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-100 z-50 transform transition-all duration-300 origin-bottom-right flex flex-col ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{ height: '500px', maxHeight: '80vh' }}
      >
        {/* Header - Strictly Black */}
        <div className="bg-black p-4 md:rounded-t-2xl rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse text-white">
            <Sparkles size={20} className="text-gold-400" />
            <h3 className="font-bold text-lg text-emerald-400">قرآن اسسٹنٹ (AI)</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper bg-opacity-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-black text-white rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                } ${msg.isError ? 'bg-red-50 border-red-200 text-red-600' : ''}`}
                dir="auto"
              >
                {msg.text}
                {msg.role === 'model' && (
                  <button 
                    onClick={() => speak(msg.text, msg.id)}
                    className={`mt-2 p-1.5 rounded-full transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter ${
                      isSpeaking === msg.id ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isSpeaking === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {isSpeaking === msg.id ? 'Stop' : 'Read Aloud'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2 space-x-reverse">
                <div className="w-2 h-2 bg-black rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-black rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-black rounded-full animate-bounce delay-200" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 bg-white md:rounded-b-2xl">
          <div className="flex items-center space-x-2 space-x-reverse">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="سوال پوچھیں..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-right font-urdu placeholder:font-sans"
              dir="rtl"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-black text-white p-2 rounded-full hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              <Send size={20} className={isLoading ? 'opacity-0' : ''} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChat;