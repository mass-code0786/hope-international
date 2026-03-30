import { Badge } from '@/components/ui/Badge';
import { dateTime } from '@/lib/utils/format';

export function SupportThreadList({ threads = [], selectedThreadId = '', onSelect }) {
  return (
    <div className="space-y-2">
      {threads.map((thread) => {
        const active = selectedThreadId === thread.id;
        const status = String(thread.status || 'open').toLowerCase();
        const variant = status === 'closed' ? 'default' : status === 'replied' ? 'success' : 'warning';

        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={`w-full rounded-[24px] border px-4 py-3 text-left transition ${active ? 'border-slate-900 bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] dark:border-white dark:bg-white dark:text-slate-900' : 'border-[var(--hope-border)] bg-cardSoft text-text hover:bg-card'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${active ? 'text-white dark:text-slate-900' : 'text-text'}`}>{thread.subject}</p>
                <p className={`mt-1 text-[11px] ${active ? 'text-white/78 dark:text-slate-500' : 'text-muted'}`}>{thread.category_label || thread.category || 'Support'}</p>
              </div>
              <Badge variant={variant}>{status}</Badge>
            </div>
            <p className={`mt-3 line-clamp-2 text-xs leading-5 ${active ? 'text-white/78 dark:text-slate-500' : 'text-muted'}`}>{thread.last_message || 'No messages yet'}</p>
            <div className={`mt-3 flex items-center justify-between text-[10px] ${active ? 'text-white/70 dark:text-slate-500' : 'text-muted'}`}>
              <span>{thread.message_count} messages</span>
              <span>{dateTime(thread.updated_at)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
