import React, { useState } from 'react';
import { 
  BookOpen, Scroll, ArrowLeft, Play, ExternalLink, Edit2, 
  Copy, Check, Volume2, Sparkles, Book, ShieldCheck, 
  ChevronRight, Search, CheckCircle2, Bookmark, Info, Maximize2
} from 'lucide-react';

interface BuiltInAppViewerProps {
  appId: 'arabi' | 'seerah';
  savedUrl?: string;
  onSaveUrl?: (url: string) => void;
  onBackToProfile?: () => void;
}

// -------------------------------------------------------------
// 1. AAIYE ARABI SEEKHEIN (TURKISH BORDER READER)
// -------------------------------------------------------------
const ArabiSeekheinApp: React.FC = () => {
  const [activeLesson, setActiveLesson] = useState<number>(0);
  const [selectedWord, setSelectedWord] = useState<any>(null);

  const LESSONS = [
    {
      id: 1,
      title: 'قرآنی عربی الفاظ و معانی (Surah Al-Fatiha Breakdown)',
      sub: 'ترکش بارڈر خط اور لفظ بہ لفظ نحوی و لغوی تشریح',
      verses: [
        {
          arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          words: [
            { ar: 'بِ', ur: 'ساتھ / سے', root: 'حرف جر', type: 'حرف' },
            { ar: 'اسْمِ', ur: 'نام', root: 'س-م-و', type: 'اسم مجرور' },
            { ar: 'اللَّهِ', ur: 'اللہ تعالیٰ', root: 'ا-ل-ہ', type: 'اسم جلالت' },
            { ar: 'الرَّحْمَٰنِ', ur: 'نہایت مہربان', root: 'ر-ح-م', type: 'صفت' },
            { ar: 'الرَّحِيمِ', ur: 'بار بار رحم فرمانے والا', root: 'ر-ح-م', type: 'صفت' },
          ]
        },
        {
          arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
          words: [
            { ar: 'الْحَمْدُ', ur: 'سب تعریفیں اور شکر', root: 'ح-م-د', type: 'مبتدا مرفوع' },
            { ar: 'لِلَّهِ', ur: 'اللہ ہی کے لیے', root: 'ل + اللہ', type: 'جار و مجرور' },
            { ar: 'رَبِّ', ur: 'پروردگار / پالنے والا', root: 'ر-ب-ب', type: 'صفت / بدل' },
            { ar: 'الْعَالَمِينَ', ur: 'تمام جہانوں کا', root: 'ع-ل-م', type: 'مضاف الیہ' },
          ]
        },
        {
          arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
          words: [
            { ar: 'إِيَّاكَ', ur: 'صرف تیری ہی', root: 'ضمیر نصب منفصل', type: 'مفعول بہ مقدم' },
            { ar: 'نَعْبُدُ', ur: 'ہم عبادت کرتے ہیں', root: 'ع-ب-د', type: 'فعل مضارع' },
            { ar: 'وَ', ur: 'اور', root: 'حرف عطف', type: 'حرف' },
            { ar: 'إِيَّاكَ', ur: 'صرف تجھ ہی سے', root: 'ضمیر منفصل', type: 'مفعول بہ مقدم' },
            { ar: 'نَسْتَعِينُ', ur: 'ہم مدد مانگتے ہیں', root: 'ع-و-ن', type: 'فعل مضارع استفعال' },
          ]
        }
      ]
    },
    {
      id: 2,
      title: 'عربی گرائمر کے بنیادی قواعد (Arabic Grammar Fundamentals)',
      sub: 'اسم، فعل، حرف اور جملہ اسمیہ و جملہ فعلیہ کے اصول',
      rules: [
        {
          title: 'کلمہ کی اقسام (Parts of Speech)',
          detail: 'عربی میں ہر بامعنی لفظ کو کلمہ کہتے ہیں، اس کی تین قسمیں ہیں: اسم (Noun)، فعل (Verb) اور حرف (Particle)۔'
        },
        {
          title: 'اعراب (Cases: رفع، نصب، جر)',
          detail: 'فاعل ہمیشہ مرفوع (پیش/ضمہ)، مفعول ہمیشہ منصوب (زبر/فتحہ)، اور حرفِ جر کے بعد اسم ہمیشہ مجرور (زیر/کسرہ) ہوتا ہے۔'
        },
        {
          title: 'ثلاثی مجرد کے ابواب (Triliteral Verb Forms)',
          detail: 'قرآن کریم میں افعال کے 6 بنیادی ابواب کثرت سے آتے ہیں: نَصَرَ، ضَرَبَ، سَمِعَ، فَتَحَ، حَسِبَ، کَرُمَ۔'
        }
      ]
    },
    {
      id: 3,
      title: 'آیت الکرسی کا ترکش بارڈر مطالعہ (Ayat-ul-Kursi Calligraphy)',
      sub: 'عظمتِ الٰہی پر مشتمل سب سے افضل آیت کا مطالعہ',
      verses: [
        {
          arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
          words: [
            { ar: 'اللَّهُ', ur: 'اللہ وہ ہے', root: 'ا-ل-ہ', type: 'مبتدا' },
            { ar: 'لَا إِلَٰهَ', ur: 'کوئی معبود نہیں', root: 'نفی جنس', type: 'حرف و اسم' },
            { ar: 'إِلَّا', ur: 'سوائے', root: 'حرف استثناء', type: 'حرف' },
            { ar: 'هُوَ', ur: 'اس کے', root: 'ضمیر منفصل', type: 'بدل' },
            { ar: 'الْحَيُّ', ur: 'جو ہمیشہ زندہ ہے', root: 'ح-ی-ی', type: 'خبر' },
            { ar: 'الْقَيُّومُ', ur: 'سب کو سنبھالنے والا', root: 'ق-و-م', type: 'خبر ثانی' },
          ]
        }
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-6 bg-[#fcf9f2] min-h-[600px] flex flex-col">
      {/* Turkish Border Ornate Frame Header */}
      <div className="relative p-6 bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 text-white rounded-3xl shadow-xl border-4 border-amber-500/40 mb-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative z-10 text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 mb-2 inline-block">
            Turkish Border Calligraphy & Grammar Reader
          </span>
          <h2 className="font-arabic text-3xl sm:text-4xl text-amber-300 mb-1" style={{ fontFamily: "'Al Qalam Quran Majeed', serif" }}>
            آئیے عربی سیکھیں • ترکش بارڈر ریڈر
          </h2>
          <p className="text-gray-300 text-xs sm:text-sm max-w-xl mx-auto font-urdu">
            قرآنی عربی الفاظ کا تجزیہ، گرائمر کے قواعد اور عثمانی خطاطی کی روایات کے ساتھ مطالعہ
          </p>
        </div>
      </div>

      {/* Lesson Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {LESSONS.map((lesson, idx) => (
          <button
            key={lesson.id}
            onClick={() => {
              setActiveLesson(idx);
              setSelectedWord(null);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
              activeLesson === idx
                ? 'bg-emerald-800 text-white border-emerald-700 shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'
            }`}
          >
            <BookOpen size={14} />
            <span>{lesson.title.split('(')[0].trim()}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area with Ornate Turkish Border Frame */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-4 border-double border-amber-500/50 shadow-xl flex-1 flex flex-col justify-between relative">
        <div className="mb-6">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3 mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                {LESSONS[activeLesson].title}
              </h3>
              <p className="text-xs text-gray-500 font-urdu" dir="rtl">
                {LESSONS[activeLesson].sub}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
              سبق نمبر {activeLesson + 1}
            </span>
          </div>

          {/* Verses & Words Inspector */}
          {LESSONS[activeLesson].verses ? (
            <div className="space-y-6">
              {LESSONS[activeLesson].verses.map((v, vIdx) => (
                <div key={vIdx} className="p-5 bg-amber-50/40 rounded-2xl border border-amber-200/60">
                  <div className="text-right mb-4">
                    <p 
                      className="font-arabic text-2xl sm:text-3xl text-emerald-950 font-bold leading-loose" 
                      style={{ fontFamily: "'Al Qalam Quran Majeed', serif" }} 
                      dir="rtl"
                    >
                      {v.arabic}
                    </p>
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-2">
                    الفاظ پر کلک کر کے معنی و اعراب دیکھیں (Click words to inspect):
                  </p>
                  <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
                    {v.words.map((w, wIdx) => (
                      <button
                        key={wIdx}
                        onClick={() => setSelectedWord(w)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedWord?.ar === w.ar
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-md scale-105'
                            : 'bg-white text-gray-800 hover:border-emerald-600 border-amber-200 shadow-sm'
                        }`}
                      >
                        <span className="font-arabic text-sm ml-1" style={{ fontFamily: "'Al Qalam Quran Majeed', serif" }}>{w.ar}</span>
                        <span className="text-[10px] opacity-75">({w.ur})</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Grammar Rules Card */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LESSONS[activeLesson].rules?.map((rule, rIdx) => (
                <div key={rIdx} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs mb-3 shadow-sm">
                      {rIdx + 1}
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mb-2">{rule.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed font-urdu" dir="rtl">
                      {rule.detail}
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-emerald-200/50 text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                    قرآنی نحوی اصول
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Word Inspector Box */}
          {selectedWord && (
            <div className="mt-6 p-4 bg-emerald-900 text-white rounded-2xl shadow-lg border border-emerald-700 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-400 text-black font-bold text-lg rounded-xl flex items-center justify-center shadow-inner">
                  {selectedWord.ar}
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 text-sm">{selectedWord.ar} — {selectedWord.ur}</h4>
                  <p className="text-xs text-gray-300">
                    مادہ / رُوٹ: <strong className="text-white font-mono">{selectedWord.root}</strong> | نوع: <span className="text-emerald-300 font-semibold">{selectedWord.type}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedWord(null)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-xs rounded-lg transition-colors"
              >
                بند کریں
              </button>
            </div>
          )}
        </div>

        {/* Turkish Border Footer Attribution */}
        <div className="pt-4 border-t border-amber-200 flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium text-amber-900">
            Aaiye Arabi Seekhein • Built-In Interactive Reader
          </span>
          <span className="text-[11px] font-mono text-gray-400">
            By Abdul Rasheed (rasheedpsh2023@gmail.com)
          </span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. COMPLETE SEERAH OF PROPHET MUHAMMAD (PBUH)
// -------------------------------------------------------------
const CompleteSeerahApp: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const CHAPTERS = [
    {
      id: 1,
      era: 'مکی دور (Makkan Era)',
      title: 'نسبِ مبارک، ولادتِ باسعادت اور رضاعت',
      titleEn: 'Blessed Lineage, Birth and Childhood',
      content: `حضور اقدس سیدنا محمد رسول اللہ ﷺ کا تعلق بنو ہاشم قبیلہ قریش سے ہے۔ آپ کے والد ماجد کا نام عبداللہ بن عبدالمطلب اور والدہ ماجدہ کا نام سیدہ آمنہ تھا۔ آپ کی ولادتِ با سعادت عام الفیل (571ء) میں 12 ربیع الاول بروز پیر مکہ مکرمہ میں ہوئی۔

ولادت سے قبل ہی والد ماجد کا انتقال ہو گیا تھا۔ بچپن میں حضرت حلیمہ سعدیہ رضی اللہ عنہا نے آپ کی رضاعت کی سعادت حاصل کی۔ چھ سال کی عمر میں والدہ ماجدہ کا سایہ بھی اٹھ گیا اور آٹھ سال کی عمر میں دادا عبدالمطلب کا انتقال ہوا۔ اس کے بعد آپ کے چچا ابو طالب نے آپ کی کفالت کی اور محبت و شفقت کا حق ادا کیا۔`,
      lessons: 'صبر، استقامت، اور یتیمی کے باوجود پاکیزہ سیرت و کردار'
    },
    {
      id: 2,
      era: 'مکی دور (Makkan Era)',
      title: 'صادق و امین اور اعلانِ نبوت (بعثت)',
      titleEn: 'Truthful, Trustworthy and Prophethood',
      content: `جوانی میں آپ ﷺ کو مکہ کے تمام لوگ "الصادق" (سچے) اور "الامین" (امانت دار) کے لقب سے پکارتے تھے۔ 25 سال کی عمر میں حضرت خدیجہ رضی اللہ عنہا سے نکاح ہوا۔

40 سال کی عمر مبارک میں غارِ حرا میں جبرائیل امین علیہ السلام پہلی وحی "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ" لے کر نازل ہوئے۔ آپ ﷺ نے پہلے خفیہ اور پھر کوہِ صفا پر کھڑے ہو کر تمام قریش کو توحید اور آخرت کی کھلی دعوت دی۔ قریش نے شدید مخالفت کی، صحابہ کرام پر ظلم و ستم ڈھائے، مگر حق کی شمع جلتی رہی۔`,
      lessons: 'امانت، دیانت، اور حق بات پر اٹل رہنے کا پختہ عزم'
    },
    {
      id: 3,
      era: 'ہجرت و مدنی دور (Hijrah & Madani Era)',
      title: 'ہجرتِ مدینہ اور میثاقِ مدینہ',
      titleEn: 'Migration to Madinah & The Constitution',
      content: `تیرہ سال مکہ میں تبلیغ اور قریش کے ظلم کے بعد اللہ تعالیٰ کے حکم سے آپ ﷺ نے حضرت ابوبکر صدیق رضی اللہ عنہ کے ساتھ مدینہ منورہ کی طرف ہجرت فرمائی۔ غارِ ثور میں پناہ لی اور بخیریت یثرب (مدینہ) پہنچے۔

مدینہ پہنچ کر مسجدِ نبوی کی بنیاد رکھی، مہاجرین اور انصار کے درمیان تاریخ ساز "مواخات" (بھائی چارہ) قائم کیا، اور یہودیوں کے ساتھ "میثاقِ مدینہ" تحریر فرمایا جو دنیا کا پہلا تحریری آئین ہے۔ اس سے امن و امان کی فضا قائم ہوئی۔`,
      lessons: 'اتحاد و بھائی چارہ، عادلانہ ریاست کا قیام، اور امن کے معاہدات'
    },
    {
      id: 4,
      era: 'مدنی دور (Madani Era)',
      title: 'غزوات، فتحِ مکہ اور معافی عام',
      titleEn: 'Major Battles & The Conquest of Makkah',
      content: `حق و باطل کے معرکوں میں غزوہ بدر (2 ہجری) اسلام کا پہلا فیصلہ کن معرکہ تھا جس میں 313 مسلمانوں نے ایک ہزار لشکر کو شکست دی۔ اس کے بعد غزوہ احد اور غزوہ خندق پیش آئے۔

8 ہجری میں دس ہزار صحابہ کرام کے ساتھ مکہ مکرمہ فتح ہوا۔ بغیر خون خرابے کے مکہ میں داخل ہو کر کعبہ کو 360 بتوں سے پاک کیا۔ آپ ﷺ نے ان تمام دشمنوں کو، جنہوں نے برسوں مظالم ڈھائے تھے، یہ فرما کر معاف کر دیا: "لَا تَثْرِيبَ عَلَيْكُمُ الْيَوْمَ ۚ يَغْفِرُ اللَّهُ لَكُمْ" (آج تم پر کوئی گرفت نہیں، جاؤ تم سب آزاد ہو)۔ یہ عفو و درگزر کی بے مثال تاریخ ہے۔`,
      lessons: 'فتح کے وقت عاجزی، دشمنوں کے ساتھ حسنِ سلوک اور عام معافی'
    },
    {
      id: 5,
      era: 'تکمیلِ دین (Completion of Faith)',
      title: 'خطبہ حجتہ الوداع اور وصالِ مبارک',
      titleEn: 'Farewell Sermon & Blessed Departure',
      content: `10 ہجری میں آپ ﷺ نے سوا لاکھ صحابہ کے ساتھ حج ادا فرمایا اور میدانِ عرفات میں تاریخی خطبہ ارشاد فرمایا۔ آپ ﷺ نے انسانی حقوق، جان، مال اور عزت کی حفاظت کا ابدی منشور عطا فرمایا۔ فرمایا: "کسی عربی کو عجمی پر اور کسی گورے کو کالے پر کوئی فضیلت نہیں مگر تقویٰ کے سبب"۔

11 ہجری، 12 ربیع الاول کو آپ ﷺ کا وصال مبارک ہوا اور حضرت عائشہ رضی اللہ عنہا کے حجرے میں تدفین ہوئی۔ دین مکمل ہو چکا تھا اور دنیا میں توحید کا پرچم لہرانے لگا۔`,
      lessons: 'مساوات، نسلی امتیاز کا خاتمہ، اور حقوق العباد کی پاسداری'
    }
  ];

  const filteredChapters = CHAPTERS.filter(c => 
    c.title.includes(searchQuery) || 
    c.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.content.includes(searchQuery)
  );

  return (
    <div className="p-4 sm:p-6 bg-[#f9f7f2] min-h-[600px] flex flex-col">
      {/* Top Banner */}
      <div className="relative p-6 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-white rounded-3xl shadow-xl border-4 border-amber-500/30 mb-6">
        <div className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 mb-2 inline-block">
            Authentic Chronological Encyclopedia
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-200 mb-1">
            سیرت النبی ﷺ مکمل • جامع انسائیکلوپیڈیا
          </h2>
          <p className="text-amber-100/80 text-xs sm:text-sm max-w-xl mx-auto font-urdu">
            رسول اللہ ﷺ کی حیات طیبہ، تاریخی واقعات، غزوات، اسوہ حسنہ اور اخلاقِ فاضلہ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Chapters Navigation Sidebar */}
        <div className="bg-white rounded-3xl p-4 border border-amber-200 shadow-md h-fit">
          <div className="relative mb-3">
            <input 
              type="text"
              placeholder="سیرت میں تلاش کریں (Search Seerah)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 px-3 pr-8 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-right font-urdu"
              dir="rtl"
            />
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          </div>

          <div className="space-y-2">
            {filteredChapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(idx)}
                className={`w-full p-3 rounded-2xl text-right transition-all border flex items-center justify-between group ${
                  activeChapter === idx
                    ? 'bg-amber-800 text-white border-amber-900 shadow-md'
                    : 'bg-gray-50 hover:bg-amber-50 text-gray-800 border-gray-100'
                }`}
              >
                <ChevronRight size={16} className={`transition-transform ${activeChapter === idx ? 'text-white' : 'text-gray-400'}`} />
                <div className="text-right">
                  <span className={`text-[10px] font-bold block ${activeChapter === idx ? 'text-amber-200' : 'text-amber-700'}`}>
                    {ch.era}
                  </span>
                  <h4 className="font-bold text-xs leading-snug font-urdu" dir="rtl">
                    {ch.title}
                  </h4>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chapter Reader Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  {CHAPTERS[activeChapter].era}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-2 font-urdu" dir="rtl">
                  {CHAPTERS[activeChapter].title}
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  {CHAPTERS[activeChapter].titleEn}
                </p>
              </div>
            </div>

            <div className="prose max-w-none text-gray-800 font-urdu text-sm sm:text-base leading-loose whitespace-pre-line text-right" dir="rtl">
              {CHAPTERS[activeChapter].content}
            </div>

            {/* Key Lessons Box */}
            <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <h5 className="font-bold text-amber-900 text-xs sm:text-sm mb-1 flex items-center justify-end gap-1.5 font-urdu" dir="rtl">
                <Bookmark size={14} className="text-amber-700" />
                <span>اہم اسباق و عبرت (Key Lessons)</span>
              </h5>
              <p className="text-xs text-amber-800 font-urdu text-right" dir="rtl">
                {CHAPTERS[activeChapter].lessons}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Complete Seerah of the Holy Prophet Muhammad (PBUH)</span>
            <span>Abdul Rasheed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MAIN BUILT-IN APP VIEWER CONTAINER
// -------------------------------------------------------------
export const BuiltInAppViewer: React.FC<BuiltInAppViewerProps> = ({
  appId,
  savedUrl,
  onSaveUrl,
  onBackToProfile
}) => {
  const [viewMode, setViewMode] = useState<'builtin' | 'external'>('builtin');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(savedUrl || '');
  const [urlCopied, setUrlCopied] = useState(false);

  const isValidUrl = savedUrl && (savedUrl.startsWith('https://') || savedUrl.startsWith('http://')) && !savedUrl.includes('.web.app');

  const handleSave = () => {
    let clean = urlInput.trim();
    if (clean.includes('.web.app')) {
      clean = '';
    }
    if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    if (onSaveUrl) {
      onSaveUrl(clean);
    }
    setIsEditingUrl(false);
  };

  const handleOpenExternal = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const targetUrl = (savedUrl && !savedUrl.includes('.web.app')) 
      ? savedUrl 
      : `${origin}/#${appId}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 flex-1 flex flex-col mb-8">
      {/* Top Universal Controls Bar */}
      <div className="p-4 sm:p-5 bg-gray-900 text-white border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-black/50 text-gold-400 rounded-xl border border-white/10">
            {appId === 'arabi' ? <BookOpen size={20} /> : <Scroll size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                100% Operational In-App
              </span>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">rasheedpsh2023@gmail.com</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              {appId === 'arabi' ? 'Aaiye Arabi Seekhein' : 'Complete Seerah (PBUH)'}
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Switcher: Built-in vs External (if valid external url exists) */}
          {isValidUrl && (
            <div className="bg-white/10 p-1 rounded-xl flex gap-1 border border-white/10 text-xs">
              <button
                onClick={() => setViewMode('builtin')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === 'builtin' ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:text-white'
                }`}
              >
                Built-In App
              </button>
              <button
                onClick={() => setViewMode('external')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === 'external' ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:text-white'
                }`}
              >
                External Frame
              </button>
            </div>
          )}

          {/* Connect / Change Custom Cloud Run URL button */}
          <button
            onClick={() => setIsEditingUrl(!isEditingUrl)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10 rounded-xl text-xs font-semibold transition-all active-press"
            title="Paste or update external Cloud Run URL"
          >
            <Edit2 size={13} />
            <span>{isValidUrl ? 'Change Cloud URL' : 'Connect Deployed URL'}</span>
          </button>

          {/* Launch external window */}
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-1.5 px-4 py-2 bg-gold-400 hover:bg-gold-300 text-black rounded-xl text-xs font-bold transition-all shadow-md active-press"
          >
            <Play size={13} fill="currentColor" />
            <span>{isValidUrl ? 'Launch Live Link' : 'Open in New Window'}</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* URL Configuration Dropdown */}
      {isEditingUrl && (
        <div className="p-4 bg-amber-50 border-b border-amber-200">
          <div className="max-w-2xl mx-auto">
            <label className="block text-xs font-bold text-amber-900 mb-1">
              Enter the deployed URL of this app from Google AI Studio (rasheedpsh2023@gmail.com):
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://ais-dev-...run.app or your custom domain"
                className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                Save URL
              </button>
              <button
                onClick={() => setIsEditingUrl(false)}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-[10px] text-amber-800 mt-1.5">
              Paste your deployed link here to launch or embed your standalone app. If not configured, the fully functional built-in version runs right here with zero errors.
            </p>
          </div>
        </div>
      )}

      {/* Main App Body */}
      <div className="flex-1 flex flex-col min-h-[600px]">
        {viewMode === 'external' && isValidUrl ? (
          <div className="flex-1 flex flex-col min-h-[600px] relative">
            <div className="p-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span className="truncate">External Frame View: {savedUrl}</span>
              <button 
                onClick={() => setViewMode('builtin')}
                className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-[11px] ml-2 flex-shrink-0 transition-colors"
              >
                Switch to Built-In App
              </button>
            </div>
            <iframe
              src={savedUrl}
              title="External App"
              className="w-full h-full min-h-[600px] border-0 flex-1"
              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            />
            <div className="p-3 bg-white/95 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <span className="font-mono text-blue-600 truncate">{savedUrl}</span>
              <button
                onClick={() => window.open(savedUrl, '_blank')}
                className="flex items-center gap-1 font-bold text-black hover:text-gray-700"
              >
                <span>Full Window</span>
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
        ) : (
          /* Render the rich built-in native application */
          appId === 'arabi' ? (
            <ArabiSeekheinApp />
          ) : (
            <CompleteSeerahApp />
          )
        )}
      </div>
    </div>
  );
};
