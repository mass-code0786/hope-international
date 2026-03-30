import { CheckCheck, Headset, UserRound } from 'lucide-react';
import { dateTime } from '@/lib/utils/format';

export function SupportChatBubble({ message }) {
  const mine = message.sender_type === 'user';
  const senderLabel = mine ? 'You' : message.sender_display_name || 'Support Team';

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[90%] rounded-[26px] px-4 py-3 shadow-sm sm:max-w-[82%] ${mine ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-900' : 'border border-[var(--hope-border)] bg-card text-text'}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${mine ? 'bg-white/10 text-white dark:bg-slate-900 dark:text-white' : 'bg-[var(--hope-accent-soft)] text-accent'}`}>
            {mine ? <UserRound size={14} /> : <Headset size={14} />}
          </span>
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${mine ? 'text-white/72 dark:text-slate-500' : 'text-accent'}`}>{senderLabel}</p>
          </div>
        </div>
        <p className={`mt-3 text-sm leading-6 ${mine ? 'text-white dark:text-slate-900' : 'text-muted'}`}>{message.message}</p>
        <div className={`mt-3 flex items-center justify-between gap-3 text-[10px] ${mine ? 'text-white/70 dark:text-slate-500' : 'text-muted'}`}>
          <span>{dateTime(message.created_at)}</span>
          <span className="inline-flex items-center gap-1">
            <CheckCheck size={12} />
            {mine ? 'Sent' : 'Support'}
          </span>
        </div>
      </div>
    </div>
  );
}
