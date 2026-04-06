'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { askHopeAssistant } from '@/lib/services/assistantService';

const starterPrompts = [
  'Show my wallet',
  'How much income did I earn?',
  'Show my binary status',
  'Give me a $500/month plan',
  'Can I withdraw now?'
];

function WelcomeMessage() {
  return {
    id: 'welcome',
    role: 'assistant',
    text: 'Hope AI Assistant can answer wallet, income, team growth, binary status, level income, withdrawal, and monthly plan questions using your Hope International account data.',
    suggestions: starterPrompts
  };
}

function MessageBubble({ message, onPrompt }) {
  const isAssistant = message.role === 'assistant';
  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-[0_10px_30px_rgba(0,0,0,0.16)] ${isAssistant ? 'border border-white/10 bg-[rgba(18,20,26,0.96)] text-white' : 'bg-[linear-gradient(135deg,#14b8a6,#2563eb)] text-white'}`}>
        <p>{message.text}</p>
        {isAssistant && Array.isArray(message.suggestions) && message.suggestions.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.slice(0, 3).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPrompt(item)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/85"
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
  const [messages, setMessages] = useState([WelcomeMessage()]);

  const askMutation = useMutation({
    mutationFn: (message) => askHopeAssistant(message),
    onSuccess: (result) => {
      const data = result?.data || {};
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: data.reply || 'I could not generate a response right now.',
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : []
        }
      ]);
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error.message || 'The assistant is temporarily unavailable.',
          suggestions: []
        }
      ]);
    }
  });

  const canSend = useMemo(() => input.trim().length > 0 && !askMutation.isPending, [input, askMutation.isPending]);

  function submitMessage(value) {
    const message = String(value || '').trim();
    if (!message || askMutation.isPending) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: message }
    ]);
    setInput('');
    askMutation.mutate(message);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#22c55e,#0ea5e9)] text-white shadow-[0_20px_45px_rgba(2,8,23,0.35)] md:bottom-6 md:right-6"
        aria-label="Open Hope AI Assistant"
        title="Hope AI"
      >
        <MessageCircle size={22} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm">
          <div className="absolute inset-x-3 bottom-3 top-16 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(29,32,40,0.98),rgba(12,14,18,0.98))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.5)] md:inset-auto md:bottom-6 md:right-6 md:top-auto md:h-[720px] md:w-[430px]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(34,197,94,0.18),rgba(14,165,233,0.22))] text-white">
                  <Bot size={20} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Hope AI</p>
                  <p className="mt-1 text-sm font-semibold">Hope AI Assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                aria-label="Close assistant"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onPrompt={submitMessage} />
              ))}
              {askMutation.isPending ? (
                <div className="flex justify-start">
                  <div className="rounded-[22px] border border-white/10 bg-[rgba(18,20,26,0.96)] px-4 py-3 text-sm text-white/75">
                    Checking your Hope International data and building a response.
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 px-4 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {starterPrompts.slice(0, 4).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => submitMessage(item)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80"
                  >
                    <Sparkles size={12} />
                    {item}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitMessage(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={2}
                  placeholder="Ask about wallet, income, team, binary status, or a monthly plan"
                  className="min-h-[54px] flex-1 resize-none rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#22c55e,#0ea5e9)] text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
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
