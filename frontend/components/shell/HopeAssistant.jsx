'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Bot,
  ChevronDown,
  Globe,
  MessageCircle,
  Mic,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { askHopeAssistant } from '@/lib/services/assistantService';

const LANGUAGE_STORAGE_KEY = 'assistant_language';
const VOICE_REPLY_STORAGE_KEY = 'assistant_voice_reply';

const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', dir: 'rtl' },
  { code: 'ar', label: 'Arabic', dir: 'rtl' },
  { code: 'bn', label: 'Bengali', dir: 'ltr' },
  { code: 'ps', label: 'Pashto', dir: 'rtl' }
];

const SPEECH_LANGUAGES = {
  en: 'en-US',
  hi: 'hi-IN',
  ur: 'ur-PK',
  ar: 'ar-SA',
  bn: 'bn-BD',
  ps: 'ps-AF'
};

const QUICK_ACTIONS = [
  { label: 'My Wallet', prompt: 'my wallet' },
  { label: 'My Income', prompt: 'my income' },
  { label: 'My Team', prompt: 'my team' },
  { label: 'My Binary', prompt: 'my binary status' },
  { label: 'My Level Income', prompt: 'my level income' },
  { label: 'My Withdrawals', prompt: 'my withdrawals' },
  { label: 'My Deposits', prompt: 'my deposits' },
  { label: '$100 Plan', prompt: 'I want to earn $100 per month' },
  { label: '$500 Plan', prompt: 'I want to earn $500 per month' },
  { label: '$1000 Plan', prompt: 'I want to earn $1000 per month' }
];

const UI = {
  en: {
    button: 'Hope AI',
    title: 'Hope AI Assistant',
    language: 'Language',
    welcome:
      'Hi, I’m Hope AI Assistant. Ask me anything about your ID, income, team, wallet, and growth strategy.',
    placeholder: 'Ask about your ID, wallet, income, team, or growth strategy',
    loading: 'Checking your Hope International data and building a response.',
    fallback: 'I could not generate a response right now.',
    unavailable: 'The assistant is temporarily unavailable.',
    micStart: 'Start voice input',
    micStop: 'Stop voice input',
    micListening: 'Listening...',
    micDenied: 'Microphone access required',
    micUnsupported: 'Voice input is not supported in this browser.',
    micFailed: 'Voice input failed. Please try again.',
    voiceOn: 'Voice reply ON',
    voiceOff: 'Voice reply OFF',
    voiceUnsupported: 'Voice reply is not supported in this browser.',
    speakMessage: 'Play voice reply',
    stopSpeaking: 'Stop voice reply',
    openAria: 'Open Hope AI Assistant',
    closeAria: 'Close assistant',
    sendAria: 'Send message',
    prompts: [
      'Show my wallet',
      'How much income did I earn?',
      'Show my binary status',
      'Give me a $500/month plan',
      'Can I withdraw now?'
    ]
  },
  hi: {
    button: 'Hope AI',
    title: 'Hope AI Assistant',
    language: 'भाषा',
    welcome:
      'नमस्ते, मैं Hope AI Assistant हूँ। आप अपनी आईडी, इनकम, टीम, वॉलेट और ग्रोथ स्ट्रेटेजी के बारे में कुछ भी पूछ सकते हैं।',
    placeholder: 'अपनी आईडी, वॉलेट, इनकम, टीम या ग्रोथ स्ट्रेटेजी के बारे में पूछें',
    loading: 'आपका Hope International डेटा देखकर जवाब तैयार किया जा रहा है।',
    fallback: 'मैं अभी जवाब तैयार नहीं कर सका।',
    unavailable: 'असिस्टेंट फिलहाल उपलब्ध नहीं है।',
    micStart: 'वॉइस इनपुट शुरू करें',
    micStop: 'वॉइस इनपुट रोकें',
    micListening: 'सुन रहा हूँ...',
    micDenied: 'माइक्रोफोन एक्सेस आवश्यक है',
    micUnsupported: 'इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।',
    micFailed: 'वॉइस इनपुट काम नहीं कर सका। कृपया फिर प्रयास करें।',
    voiceOn: 'वॉइस रिप्लाई चालू',
    voiceOff: 'वॉइस रिप्लाई बंद',
    voiceUnsupported: 'इस ब्राउज़र में वॉइस रिप्लाई उपलब्ध नहीं है।',
    speakMessage: 'वॉइस रिप्लाई चलाएँ',
    stopSpeaking: 'वॉइस रिप्लाई रोकें',
    openAria: 'Hope AI Assistant खोलें',
    closeAria: 'असिस्टेंट बंद करें',
    sendAria: 'संदेश भेजें',
    prompts: [
      'मेरा वॉलेट दिखाओ',
      'मेरी इनकम कितनी है?',
      'मेरा बाइनरी स्टेटस दिखाओ',
      'मुझे $500/माह प्लान दो',
      'क्या मैं withdrawal कर सकता हूँ?'
    ]
  },
  ur: {
    button: 'Hope AI',
    title: 'Hope AI Assistant',
    language: 'زبان',
    welcome:
      'السلام علیکم، میں Hope AI Assistant ہوں۔ آپ اپنی آئی ڈی، آمدنی، ٹیم، والٹ اور گروتھ اسٹریٹجی کے بارے میں کچھ بھی پوچھ سکتے ہیں۔',
    placeholder: 'اپنی آئی ڈی، والٹ، آمدنی، ٹیم یا گروتھ اسٹریٹجی کے بارے میں پوچھیں',
    loading: 'آپ کے Hope International ڈیٹا کو دیکھ کر جواب تیار کیا جا رہا ہے۔',
    fallback: 'میں اس وقت جواب تیار نہیں کر سکا۔',
    unavailable: 'اسسٹنٹ عارضی طور پر دستیاب نہیں ہے۔',
    micStart: 'وائس ان پٹ شروع کریں',
    micStop: 'وائس ان پٹ روکیں',
    micListening: 'سن رہا ہوں...',
    micDenied: 'مائیکروفون کی اجازت ضروری ہے',
    micUnsupported: 'اس براؤزر میں وائس ان پٹ دستیاب نہیں ہے۔',
    micFailed: 'وائس ان پٹ ناکام رہا۔ دوبارہ کوشش کریں۔',
    voiceOn: 'وائس رپلائی آن',
    voiceOff: 'وائس رپلائی آف',
    voiceUnsupported: 'اس براؤزر میں وائس رپلائی دستیاب نہیں ہے۔',
    speakMessage: 'وائس رپلائی چلائیں',
    stopSpeaking: 'وائس رپلائی روکیں',
    openAria: 'Hope AI Assistant کھولیں',
    closeAria: 'اسسٹنٹ بند کریں',
    sendAria: 'پیغام بھیجیں',
    prompts: [
      'میرا والٹ دکھائیں',
      'میری آمدنی کتنی ہے؟',
      'میرا بائنری اسٹیٹس دکھائیں',
      'مجھے $500 ماہانہ پلان دیں',
      'کیا میں withdrawal کر سکتا ہوں؟'
    ]
  },
  ar: {
    button: 'Hope AI',
    title: 'Hope AI Assistant',
    language: 'اللغة',
    welcome:
      'مرحبًا، أنا Hope AI Assistant. اسألني عن معرفك ودخلك وفريقك ومحفظتك وخطة النمو الخاصة بك.',
    placeholder: 'اسأل عن المعرف أو المحفظة أو الدخل أو الفريق أو خطة النمو',
    loading: 'يتم فحص بيانات Hope International الخاصة بك وتجهيز الرد.',
    fallback: 'تعذر إنشاء رد الآن.',
    unavailable: 'المساعد غير متاح مؤقتًا.',
    micStart: 'بدء الإدخال الصوتي',
    micStop: 'إيقاف الإدخال الصوتي',
    micListening: 'أستمع الآن...',
    micDenied: 'مطلوب السماح بالوصول إلى الميكروفون',
    micUnsupported: 'الإدخال الصوتي غير مدعوم في هذا المتصفح.',
    micFailed: 'فشل الإدخال الصوتي. حاول مرة أخرى.',
    voiceOn: 'الرد الصوتي مفعل',
    voiceOff: 'الرد الصوتي معطل',
    voiceUnsupported: 'الرد الصوتي غير مدعوم في هذا المتصفح.',
    speakMessage: 'تشغيل الرد الصوتي',
    stopSpeaking: 'إيقاف الرد الصوتي',
    openAria: 'افتح Hope AI Assistant',
    closeAria: 'إغلاق المساعد',
    sendAria: 'إرسال الرسالة',
    prompts: [
      'اعرض محفظتي',
      'كم يبلغ دخلي؟',
      'اعرض حالتي الثنائية',
      'أعطني خطة $500 شهريًا',
      'هل أستطيع السحب الآن؟'
    ]
  },
  bn: {
    button: 'Hope AI',
    title: 'Hope AI Assistant',
    language: 'ভাষা',
    welcome:
      'হাই, আমি Hope AI Assistant। আপনার আইডি, আয়, টিম, ওয়ালেট এবং গ্রোথ স্ট্র্যাটেজি সম্পর্কে যা খুশি জিজ্ঞাসা করুন।',
    placeholder: 'আপনার আইডি, ওয়ালেট, আয়, টিম বা গ্রোথ স্ট্র্যাটেজি সম্পর্কে জিজ্ঞাসা করুন',
    loading: 'আপনার Hope International ডেটা দেখে উত্তর তৈরি করা হচ্ছে।',
    fallback: 'আমি এখনই উত্তর তৈরি করতে পারিনি।',
    unavailable: 'অ্যাসিস্ট্যান্ট সাময়িকভাবে উপলব্ধ নয়।',
    micStart: 'ভয়েস ইনপুট শুরু করুন',
    micStop: 'ভয়েস ইনপুট বন্ধ করুন',
    micListening: 'শুনছি...',
    micDenied: 'মাইক্রোফোন অ্যাক্সেস প্রয়োজন',
    micUnsupported: 'এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়।',
    micFailed: 'ভয়েস ইনপুট কাজ করেনি। আবার চেষ্টা করুন।',
    voiceOn: 'ভয়েস রিপ্লাই চালু',
    voiceOff: 'ভয়েস রিপ্লাই বন্ধ',
    voiceUnsupported: 'এই ব্রাউজারে ভয়েস রিপ্লাই সমর্থিত নয়।',
    speakMessage: 'ভয়েস রিপ্লাই চালান',
    stopSpeaking: 'ভয়েস রিপ্লাই বন্ধ করুন',
    openAria: 'Hope AI Assistant খুলুন',
    closeAria: 'অ্যাসিস্ট্যান্ট বন্ধ করুন',
    sendAria: 'বার্তা পাঠান',
    prompts: [
      'আমার ওয়ালেট দেখাও',
      'আমার আয় কত?',
      'আমার বাইনারি স্ট্যাটাস দেখাও',
      'আমাকে $500/মাস প্ল্যান দাও',
      'আমি কি withdrawal করতে পারি?'
    ]
  },
  ps: {
    button: 'Hope AI',
    title: 'Hope AI Assistant',
    language: 'ژبه',
    welcome:
      'سلام، زه Hope AI Assistant يم. تاسو کولی شئ د خپلې آی ډي، عاید، ټیم، والټ او د ودې تګلارې په اړه هر څه وپوښتئ.',
    placeholder: 'د خپلې آی ډي، والټ، عاید، ټیم یا د ودې تګلارې په اړه پوښتنه وکړئ',
    loading: 'ستاسو د Hope International معلومات کتل کېږي او ځواب چمتو کېږي.',
    fallback: 'زه اوس ځواب نه شم چمتو کولی.',
    unavailable: 'مرستندوی اوس مهال شتون نه لري.',
    micStart: 'غږیز انپټ پیل کړئ',
    micStop: 'غږیز انپټ ودروئ',
    micListening: 'اورم...',
    micDenied: 'مایکروفون ته لاسرسی اړین دی',
    micUnsupported: 'په دې براوزر کې غږیز انپټ نشته.',
    micFailed: 'غږیز انپټ ناکام شو. بیا هڅه وکړئ.',
    voiceOn: 'غږیز ځواب چالان',
    voiceOff: 'غږیز ځواب بند',
    voiceUnsupported: 'په دې براوزر کې غږیز ځواب نشته.',
    speakMessage: 'غږیز ځواب واورئ',
    stopSpeaking: 'غږیز ځواب ودروئ',
    openAria: 'Hope AI Assistant پرانیزئ',
    closeAria: 'مرستندوی بند کړئ',
    sendAria: 'پیغام ولېږئ',
    prompts: [
      'زما والټ وښایه',
      'زما عاید څومره دی؟',
      'زما باینري حالت وښایه',
      'ما ته د $500/میاشت پلان راکړه',
      'ایا زه withdrawal کولی شم؟'
    ]
  }
};

function getUi(language) {
  return UI[language] || UI.en;
}

function getLanguageMeta(language) {
  return LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];
}

function createWelcomeMessage(language) {
  const ui = getUi(language);
  return {
    id: 'welcome',
    role: 'assistant',
    text: ui.welcome,
    suggestions: ui.prompts,
    smartSuggestions: [],
    direction: getLanguageMeta(language).dir
  };
}

function createAssistantFallback(language, kind = 'fallback') {
  const ui = getUi(language);
  const meta = getLanguageMeta(language);
  const text = kind === 'unavailable' ? ui.unavailable : ui.fallback;
  return {
    id: `assistant-fallback-${Date.now()}`,
    role: 'assistant',
    text,
    suggestions: Array.isArray(ui.prompts) ? ui.prompts.slice(0, 5) : [],
    smartSuggestions: [],
    direction: meta.dir
  };
}

function MessageBubble({
  message,
  onPrompt,
  onSpeak,
  speakingMessageId,
  ui,
  speechSupported
}) {
  const isAssistant = message.role === 'assistant';
  const isSpeaking = speakingMessageId === message.id;

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        dir={message.direction || 'ltr'}
        className={`max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-[13px] leading-5 shadow-[0_12px_28px_rgba(0,0,0,0.2)] ${
          isAssistant
            ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(22,24,31,0.96),rgba(12,14,20,0.98))] text-white'
            : 'bg-[linear-gradient(135deg,#6d28d9,#22c55e)] text-white'
        }`}
      >
        <div className="flex items-start gap-2">
          <p className="flex-1">{message.text}</p>
          {isAssistant && speechSupported ? (
            <button
              type="button"
              onClick={() => onSpeak(message)}
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                isSpeaking
                  ? 'border-emerald-300/40 bg-[linear-gradient(135deg,rgba(109,40,217,0.92),rgba(34,197,94,0.92))] text-white'
                  : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
              aria-label={isSpeaking ? ui.stopSpeaking : ui.speakMessage}
              title={isSpeaking ? ui.stopSpeaking : ui.speakMessage}
            >
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          ) : null}
        </div>
        {isAssistant && Array.isArray(message.smartSuggestions) && message.smartSuggestions.length ? (
          <div className="mt-2.5 grid gap-2">
            {message.smartSuggestions.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-emerald-400/15 bg-white/5 px-3 py-2 text-[11px] leading-5 text-white/85 shadow-[0_0_0_1px_rgba(109,40,217,0.12)]"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
        {isAssistant && Array.isArray(message.suggestions) && message.suggestions.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {message.suggestions.slice(0, 3).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPrompt(item)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/85 transition hover:bg-white/10"
              >
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
  const [seededOpen, setSeededOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const utteranceRef = useRef(null);
  const ui = getUi(language);
  const langMeta = getLanguageMeta(language);
  const speechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && LANGUAGES.some((item) => item.code === stored)) {
        setLanguage(stored);
        setMessages([createWelcomeMessage(stored)]);
      }
      const storedVoiceReply = window.localStorage.getItem(VOICE_REPLY_STORAGE_KEY);
      if (storedVoiceReply === 'true') {
        setVoiceReplyEnabled(true);
      }
    } catch (_error) {}
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!speechSupported) {
      setVoiceReplyEnabled(false);
    }
  }, [speechSupported]);

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setMessages((current) =>
      current.map((message) =>
        message.id === 'welcome' ? createWelcomeMessage(nextLanguage) : message
      )
    );
    setVoiceError('');
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch (_error) {}
  }

  function stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setSpeakingMessageId(null);
  }

  function chooseVoice(utteranceLanguage) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }
    const voices = window.speechSynthesis.getVoices();
    if (!Array.isArray(voices) || !voices.length) {
      return null;
    }
    const exact = voices.find((voice) => voice.lang === utteranceLanguage);
    if (exact) return exact;
    const base = utteranceLanguage.split('-')[0];
    return (
      voices.find((voice) => voice.lang?.startsWith(base)) ||
      voices.find((voice) => voice.default) ||
      voices[0] ||
      null
    );
  }

  function speakMessage(message) {
    if (!speechSupported || !message?.text?.trim()) {
      if (!speechSupported) {
        setVoiceError(ui.voiceUnsupported);
      }
      return;
    }

    if (speakingMessageId === message.id) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    setVoiceError('');

    const utteranceLanguage = SPEECH_LANGUAGES[language] || SPEECH_LANGUAGES.en;
    const utterance = new window.SpeechSynthesisUtterance(message.text.trim());
    utterance.lang = utteranceLanguage;
    const voice = chooseVoice(utteranceLanguage);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || utteranceLanguage;
    }
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeakingMessageId((current) => (current === message.id ? null : current));
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeakingMessageId(null);
    };
    utteranceRef.current = utterance;
    setSpeakingMessageId(message.id);
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoiceReply() {
    if (!speechSupported) {
      setVoiceError(ui.voiceUnsupported);
      return;
    }
    setVoiceReplyEnabled((current) => {
      const nextValue = !current;
      try {
        window.localStorage.setItem(VOICE_REPLY_STORAGE_KEY, String(nextValue));
      } catch (_error) {}
      return nextValue;
    });
  }

  const askMutation = useMutation({
    mutationFn: ({ message, selectedLanguage }) => askHopeAssistant(message, selectedLanguage),
    onSuccess: (result, variables) => {
      const data = result?.data || {};
      const responseLanguage = variables?.selectedLanguage || language;
      const responseUi = getUi(responseLanguage);
      const responseMeta = getLanguageMeta(responseLanguage);
      const text =
        typeof data.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : responseUi.fallback;
      const nextMessage = text
        ? {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text,
            suggestions:
              Array.isArray(data.suggestions) && data.suggestions.length
                ? data.suggestions
                : responseUi.prompts.slice(0, 5),
            smartSuggestions: Array.isArray(data.smartSuggestions)
              ? data.smartSuggestions
              : [],
            direction: data.direction || responseMeta.dir
          }
        : createAssistantFallback(responseLanguage, 'fallback');
      setMessages((current) => [...current, nextMessage]);
      if (voiceReplyEnabled && speechSupported) {
        setTimeout(() => {
          speakMessage(nextMessage);
        }, 0);
      }
    },
    onError: (_error, variables) => {
      const responseLanguage = variables?.selectedLanguage || language;
      setMessages((current) => [
        ...current,
        createAssistantFallback(responseLanguage, 'unavailable')
      ]);
    }
  });

  useEffect(() => {
    if (!open) {
      setSeededOpen(false);
      return;
    }
    if (seededOpen || askMutation.isPending) return;
    setSeededOpen(true);
    askMutation.mutate({ message: 'show my suggestions', selectedLanguage: language });
  }, [open, seededOpen, language, askMutation]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !askMutation.isPending,
    [input, askMutation.isPending]
  );

  function submitMessage(value) {
    const message = String(value || '').trim();
    if (!message || askMutation.isPending) return;
    stopSpeaking();
    setVoiceError('');
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: message, direction: langMeta.dir }
    ]);
    setInput('');
    askMutation.mutate({ message, selectedLanguage: language });
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }

  function startListening() {
    setVoiceError('');

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setVoiceError(ui.micUnsupported);
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANGUAGES[language] || SPEECH_LANGUAGES.en;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    transcriptRef.current = '';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError('');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      transcriptRef.current = transcript;
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        setVoiceError(ui.micDenied);
        return;
      }
      if (event?.error === 'aborted') {
        return;
      }
      setVoiceError(ui.micFailed);
    };

    recognition.onend = () => {
      const transcript = transcriptRef.current.trim();
      setIsListening(false);
      recognitionRef.current = null;
      if (transcript && !askMutation.isPending) {
        submitMessage(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(135deg,#6d28d9,#22c55e)] px-4 text-white shadow-[0_20px_45px_rgba(2,8,23,0.35)] md:bottom-6 md:right-6"
        aria-label={ui.openAria}
        title={ui.button}
      >
        <MessageCircle size={18} />
        <span className="text-sm font-semibold">{ui.button}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm">
          <div className="absolute inset-x-3 bottom-3 top-16 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,28,36,0.98),rgba(10,12,18,0.99))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.5)] md:inset-auto md:bottom-6 md:right-6 md:top-auto md:h-[700px] md:w-[420px]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(109,40,217,0.3),rgba(34,197,94,0.22))] text-white">
                  <Bot size={18} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Hope AI</p>
                  <p className="mt-1 text-sm font-semibold">{ui.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {speechSupported ? (
                  <button
                    type="button"
                    onClick={toggleVoiceReply}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                      voiceReplyEnabled
                        ? 'border-emerald-300/30 bg-[linear-gradient(135deg,rgba(109,40,217,0.92),rgba(34,197,94,0.92))] text-white'
                        : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                    }`}
                    title={voiceReplyEnabled ? ui.voiceOn : ui.voiceOff}
                  >
                    {voiceReplyEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                    <span>{voiceReplyEnabled ? ui.voiceOn : ui.voiceOff}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                  aria-label={ui.closeAria}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="border-b border-white/10 px-4 py-2.5">
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                <Globe size={13} />
                {ui.language}
              </label>
              <div className="relative mt-2">
                <select
                  value={language}
                  onChange={(event) => changeLanguage(event.target.value)}
                  className="w-full appearance-none rounded-[18px] border border-white/10 bg-white/5 px-3.5 py-2.5 pr-10 text-sm text-white outline-none"
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code} className="bg-[#16181f] text-white">
                      {item.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/55"
                />
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3.5">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onPrompt={submitMessage}
                  onSpeak={speakMessage}
                  speakingMessageId={speakingMessageId}
                  ui={ui}
                  speechSupported={speechSupported}
                />
              ))}
              {askMutation.isPending ? (
                <div className="flex justify-start">
                  <div
                    dir={langMeta.dir}
                    className="rounded-[20px] border border-white/10 bg-[rgba(18,20,26,0.96)] px-3.5 py-2.5 text-[13px] text-white/75"
                  >
                    {ui.loading}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 px-4 py-3.5">
              <div className="mb-3 flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => submitMessage(item.prompt)}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-1.5 text-[10px] font-semibold text-white shadow-[0_0_0_1px_rgba(109,40,217,0.18),0_10px_18px_rgba(0,0,0,0.18)] transition hover:border-emerald-300/30 hover:bg-white/10"
                  >
                    <Sparkles size={12} />
                    {item.label}
                  </button>
                ))}
              </div>

              {isListening || voiceError ? (
                <div
                  className={`mb-3 rounded-2xl border px-3 py-2 text-[11px] ${
                    isListening
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                      : 'border-rose-400/25 bg-rose-500/10 text-rose-100'
                  }`}
                >
                  {isListening ? ui.micListening : voiceError}
                </div>
              ) : null}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitMessage(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  dir={langMeta.dir}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={2}
                  placeholder={ui.placeholder}
                  className="min-h-[52px] flex-1 resize-none rounded-[20px] border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={startListening}
                  disabled={askMutation.isPending}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-white shadow-[0_14px_28px_rgba(109,40,217,0.18)] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isListening
                      ? 'animate-pulse border-emerald-300/40 bg-[linear-gradient(135deg,rgba(109,40,217,0.92),rgba(34,197,94,0.92))]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  aria-label={isListening ? ui.micStop : ui.micStart}
                  title={isListening ? ui.micStop : ui.micStart}
                >
                  {isListening ? <Square size={15} /> : <Mic size={16} />}
                </button>
                <button
                  type="submit"
                  disabled={!canSend}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6d28d9,#22c55e)] text-white shadow-[0_14px_28px_rgba(109,40,217,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={ui.sendAria}
                >
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
