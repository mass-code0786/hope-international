'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, ChevronDown, Globe, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { askHopeAssistant } from '@/lib/services/assistantService';

const LANGUAGE_STORAGE_KEY = 'assistant_language';
const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', dir: 'rtl' },
  { code: 'ar', label: 'Arabic', dir: 'rtl' },
  { code: 'bn', label: 'Bengali', dir: 'ltr' },
  { code: 'ps', label: 'Pashto', dir: 'rtl' }
];

const UI = {
  en: { button: 'Hope AI', title: 'Hope AI Assistant', language: 'Language', welcome: 'Hi, I’m Hope AI Assistant. Ask me anything about your ID, income, team, wallet, and growth strategy.', placeholder: 'Ask about your ID, wallet, income, team, or growth strategy', loading: 'Checking your Hope International data and building a response.', fallback: 'I could not generate a response right now.', unavailable: 'The assistant is temporarily unavailable.', openAria: 'Open Hope AI Assistant', closeAria: 'Close assistant', sendAria: 'Send message', prompts: ['Show my wallet', 'How much income did I earn?', 'Show my binary status', 'Give me a $500/month plan', 'Can I withdraw now?'] },
  hi: { button: 'Hope AI', title: 'Hope AI Assistant', language: 'भाषा', welcome: 'Hope AI Assistant आपके Hope International अकाउंट डेटा के आधार पर वॉलेट, इनकम, टीम ग्रोथ, बाइनरी स्टेटस, लेवल इनकम, विड्रॉअल और मासिक प्लान से जुड़े सवालों के जवाब दे सकता है।', placeholder: 'वॉलेट, इनकम, टीम, बाइनरी स्टेटस या मासिक प्लान के बारे में पूछें', loading: 'आपका Hope International डेटा जाँचा जा रहा है और जवाब तैयार किया जा रहा है।', fallback: 'मैं अभी जवाब तैयार नहीं कर सका।', unavailable: 'असिस्टेंट फिलहाल उपलब्ध नहीं है।', openAria: 'Hope AI Assistant खोलें', closeAria: 'असिस्टेंट बंद करें', sendAria: 'संदेश भेजें', prompts: ['मेरा वॉलेट दिखाओ', 'मेरी इनकम कितनी है?', 'मेरा बाइनरी स्टेटस दिखाओ', 'मुझे $500/माह प्लान दो', 'क्या मैं withdrawal कर सकता हूँ?'] },
  ur: { button: 'Hope AI', title: 'Hope AI Assistant', language: 'زبان', welcome: 'Hope AI Assistant آپ کے Hope International اکاؤنٹ ڈیٹا کی بنیاد پر والٹ، آمدنی، ٹیم گروتھ، بائنری اسٹیٹس، لیول انکم، ودڈرال اور ماہانہ پلان سے متعلق سوالات کے جواب دے سکتا ہے۔', placeholder: 'والٹ، آمدنی، ٹیم، بائنری اسٹیٹس یا ماہانہ پلان کے بارے میں پوچھیں', loading: 'آپ کے Hope International ڈیٹا کو چیک کر کے جواب تیار کیا جا رہا ہے۔', fallback: 'میں اس وقت جواب تیار نہیں کر سکا۔', unavailable: 'اسسٹنٹ عارضی طور پر دستیاب نہیں ہے۔', openAria: 'Hope AI Assistant کھولیں', closeAria: 'اسسٹنٹ بند کریں', sendAria: 'پیغام بھیجیں', prompts: ['میرا والٹ دکھائیں', 'میری آمدنی کتنی ہے؟', 'میرا بائنری اسٹیٹس دکھائیں', 'مجھے $500 ماہانہ پلان دیں', 'کیا میں withdrawal کر سکتا ہوں؟'] },
  ar: { button: 'Hope AI', title: 'Hope AI Assistant', language: 'اللغة', welcome: 'يمكن لـ Hope AI Assistant الإجابة على أسئلة المحفظة والدخل ونمو الفريق والحالة الثنائية ودخل المستويات والسحب والخطط الشهرية باستخدام بيانات حسابك في Hope International.', placeholder: 'اسأل عن المحفظة أو الدخل أو الفريق أو الحالة الثنائية أو الخطة الشهرية', loading: 'يتم فحص بيانات Hope International الخاصة بك وتجهيز الرد.', fallback: 'لم أتمكن من إنشاء رد الآن.', unavailable: 'المساعد غير متاح مؤقتًا.', openAria: 'افتح Hope AI Assistant', closeAria: 'إغلاق المساعد', sendAria: 'إرسال الرسالة', prompts: ['اعرض محفظتي', 'كم يبلغ دخلي؟', 'اعرض حالتي الثنائية', 'أعطني خطة $500 شهريًا', 'هل أستطيع السحب الآن؟'] },
  bn: { button: 'Hope AI', title: 'Hope AI Assistant', language: 'ভাষা', welcome: 'Hope AI Assistant আপনার Hope International অ্যাকাউন্ট ডেটার ভিত্তিতে ওয়ালেট, আয়, টিম গ্রোথ, বাইনারি স্ট্যাটাস, লেভেল ইনকাম, উইথড্রয়াল এবং মাসিক পরিকল্পনা নিয়ে উত্তর দিতে পারে।', placeholder: 'ওয়ালেট, আয়, টিম, বাইনারি স্ট্যাটাস বা মাসিক পরিকল্পনা সম্পর্কে জিজ্ঞাসা করুন', loading: 'আপনার Hope International ডেটা দেখে উত্তর তৈরি করা হচ্ছে।', fallback: 'আমি এখনই উত্তর তৈরি করতে পারিনি।', unavailable: 'সহকারী সাময়িকভাবে অনুপলব্ধ।', openAria: 'Hope AI Assistant খুলুন', closeAria: 'সহকারী বন্ধ করুন', sendAria: 'বার্তা পাঠান', prompts: ['আমার ওয়ালেট দেখাও', 'আমার আয় কত?', 'আমার বাইনারি স্ট্যাটাস দেখাও', 'আমাকে $500/মাস পরিকল্পনা দাও', 'আমি কি এখন withdrawal করতে পারি?'] },
  ps: { button: 'Hope AI', title: 'Hope AI Assistant', language: 'ژبه', welcome: 'Hope AI Assistant کولی شي ستاسو د Hope International حساب د معلوماتو پر بنسټ د والټ، عاید، ټیم ودې، باینري حالت، لیول عاید، وېستلو او میاشتني پلان په اړه ځواب درکړي.', placeholder: 'د والټ، عاید، ټیم، باینري حالت یا میاشتني پلان په اړه پوښتنه وکړئ', loading: 'ستاسو د Hope International معلومات کتل کېږي او ځواب جوړېږي.', fallback: 'زه اوس ځواب نه شم جوړولای.', unavailable: 'مرستیال اوس مهال شتون نه لري.', openAria: 'Hope AI Assistant پرانیزئ', closeAria: 'مرستیال بند کړئ', sendAria: 'پیغام ولېږئ', prompts: ['زما والټ وښایه', 'زما عاید څومره دی؟', 'زما باینري حالت وښایه', 'ما ته د $500/میاشت پلان راکړه', 'ایا زه اوس withdrawal کولی شم؟'] }
};

function getUi(language) {
  return UI[language] || UI.en;
}

function getLanguageMeta(language) {
  return LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];
}

function createWelcomeMessage(language) {
  const ui = getUi(language);
  return { id: 'welcome', role: 'assistant', text: ui.welcome, suggestions: ui.prompts, direction: getLanguageMeta(language).dir };
}

function MessageBubble({ message, onPrompt }) {
  const isAssistant = message.role === 'assistant';
  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div dir={message.direction || 'ltr'} className={`max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-[13px] leading-5 shadow-[0_12px_28px_rgba(0,0,0,0.2)] ${isAssistant ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(22,24,31,0.96),rgba(12,14,20,0.98))] text-white' : 'bg-[linear-gradient(135deg,#6d28d9,#22c55e)] text-white'}`}>
        <p>{message.text}</p>
        {isAssistant && Array.isArray(message.suggestions) && message.suggestions.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {message.suggestions.slice(0, 3).map((item) => (
              <button key={item} type="button" onClick={() => onPrompt(item)} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/85 transition hover:bg-white/10">
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HopeAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [messages, setMessages] = useState([createWelcomeMessage('en')]);
  const ui = getUi(language);
  const langMeta = getLanguageMeta(language);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && LANGUAGES.some((item) => item.code === stored)) {
        setLanguage(stored);
        setMessages([createWelcomeMessage(stored)]);
      }
    } catch (_error) {}
  }, []);

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setMessages((current) => current.map((message) => (message.id === 'welcome' ? createWelcomeMessage(nextLanguage) : message)));
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch (_error) {}
  }

  const askMutation = useMutation({
    mutationFn: ({ message, selectedLanguage }) => askHopeAssistant(message, selectedLanguage),
    onSuccess: (result, variables) => {
      const data = result?.data || {};
      const responseLanguage = variables?.selectedLanguage || language;
      const responseUi = getUi(responseLanguage);
      const responseMeta = getLanguageMeta(responseLanguage);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: data.reply || responseUi.fallback, suggestions: Array.isArray(data.suggestions) ? data.suggestions : [], direction: data.direction || responseMeta.dir }]);
    },
    onError: (error, variables) => {
      const responseLanguage = variables?.selectedLanguage || language;
      const responseUi = getUi(responseLanguage);
      const responseMeta = getLanguageMeta(responseLanguage);
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: 'assistant', text: error.message || responseUi.unavailable, suggestions: [], direction: responseMeta.dir }]);
    }
  });

  const canSend = useMemo(() => input.trim().length > 0 && !askMutation.isPending, [input, askMutation.isPending]);

  function submitMessage(value) {
    const message = String(value || '').trim();
    if (!message || askMutation.isPending) return;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: message, direction: langMeta.dir }]);
    setInput('');
    askMutation.mutate({ message, selectedLanguage: language });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-20 right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(135deg,#6d28d9,#22c55e)] px-4 text-white shadow-[0_20px_45px_rgba(2,8,23,0.35)] md:bottom-6 md:right-6" aria-label={ui.openAria} title={ui.button}>
        <MessageCircle size={18} />
        <span className="text-sm font-semibold">{ui.button}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm">
          <div className="absolute inset-x-3 bottom-3 top-16 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,28,36,0.98),rgba(10,12,18,0.99))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.5)] md:inset-auto md:bottom-6 md:right-6 md:top-auto md:h-[700px] md:w-[420px]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(109,40,217,0.3),rgba(34,197,94,0.22))] text-white"><Bot size={18} /></span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Hope AI</p>
                  <p className="mt-1 text-sm font-semibold">{ui.title}</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10" aria-label={ui.closeAria}>
                <X size={16} />
              </button>
            </div>

            <div className="border-b border-white/10 px-4 py-2.5">
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                <Globe size={13} />
                {ui.language}
              </label>
              <div className="relative mt-2">
                <select value={language} onChange={(event) => changeLanguage(event.target.value)} className="w-full appearance-none rounded-[18px] border border-white/10 bg-white/5 px-3.5 py-2.5 pr-10 text-sm text-white outline-none">
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code} className="bg-[#16181f] text-white">{item.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/55" />
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3.5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onPrompt={submitMessage} />
              ))}
              {askMutation.isPending ? (
                <div className="flex justify-start">
                  <div dir={langMeta.dir} className="rounded-[20px] border border-white/10 bg-[rgba(18,20,26,0.96)] px-3.5 py-2.5 text-[13px] text-white/75">{ui.loading}</div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 px-4 py-3.5">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {ui.prompts.slice(0, 4).map((item) => (
                  <button key={item} type="button" onClick={() => submitMessage(item)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/80 transition hover:bg-white/10">
                    <Sparkles size={12} />
                    {item}
                  </button>
                ))}
              </div>

              <form onSubmit={(event) => { event.preventDefault(); submitMessage(input); }} className="flex items-end gap-2">
                <textarea dir={langMeta.dir} value={input} onChange={(event) => setInput(event.target.value)} rows={2} placeholder={ui.placeholder} className="min-h-[52px] flex-1 resize-none rounded-[20px] border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/35" />
                <button type="submit" disabled={!canSend} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6d28d9,#22c55e)] text-white shadow-[0_14px_28px_rgba(109,40,217,0.22)] disabled:cursor-not-allowed disabled:opacity-50" aria-label={ui.sendAria}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
