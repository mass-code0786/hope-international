'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Headset, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminSupportThread, sendAdminSupportMessage, updateAdminSupportStatus } from '@/lib/services/admin';
import { dateTime } from '@/lib/utils/format';

const statusTone = {
  open: 'bg-amber-500/10 text-amber-200',
  replied: 'bg-emerald-500/10 text-emerald-200',
  closed: 'bg-white/10 text-muted'
};

function MessageBubble({ message }) {
  const admin = message.sender_type === 'admin';
  return (
    <div className={`flex ${admin ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[86%] rounded-[22px] px-4 py-3 ${admin ? 'bg-accent text-black' : 'border border-white/10 bg-cardSoft text-text'}`}>
        <p className={`text-[11px] font-semibold ${admin ? 'text-black/70' : 'text-muted'}`}>{admin ? (message.sender_display_name || 'Admin') : (message.sender_display_name || 'Member')}</p>
        <p className="mt-1 text-sm leading-6">{message.message}</p>
        <p className={`mt-2 text-[10px] ${admin ? 'text-black/60' : 'text-muted'}`}>{dateTime(message.created_at)}</p>
      </div>
    </div>
  );
}

export default function AdminSupportDetailPage() {
  const params = useParams();
  const threadId = params?.id;
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');
  const [status, setStatus] = useState('open');

  const threadQuery = useQuery({
    queryKey: queryKeys.adminSupportDetail(threadId),
    queryFn: () => getAdminSupportThread(threadId),
    enabled: Boolean(threadId)
  });

  const thread = threadQuery.data?.data?.thread || null;
  const messages = Array.isArray(threadQuery.data?.data?.messages) ? threadQuery.data.data.messages : [];

  useEffect(() => {
    if (thread?.status) setStatus(thread.status);
  }, [thread?.status]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminSupport });
    if (threadId) await queryClient.invalidateQueries({ queryKey: queryKeys.adminSupportDetail(threadId) });
  };

  const replyMutation = useMutation({
    mutationFn: () => sendAdminSupportMessage(threadId, { message: replyMessage }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Reply sent');
      setReplyMessage('');
      setStatus(result?.data?.thread?.status || 'replied');
      await refresh();
    },
    onError: (error) => toast.error(error.message || 'Unable to send reply')
  });

  const statusMutation = useMutation({
    mutationFn: () => updateAdminSupportStatus(threadId, status),
    onSuccess: async (result) => {
      toast.success(result.message || 'Status updated');
      setStatus(result?.data?.thread?.status || status);
      await refresh();
    },
    onError: (error) => toast.error(error.message || 'Unable to update status')
  });

  if (threadQuery.isLoading) return null;
  if (threadQuery.isError) return <ErrorState message="Unable to load this support thread." onRetry={threadQuery.refetch} />;
  if (!thread) return <ErrorState message="Support thread was not found." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/support" className="inline-flex items-center gap-2 text-sm text-muted">
            <ArrowLeft size={15} />
            Back to support inbox
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-text">{thread.subject}</h1>
          <p className="mt-1 text-sm text-muted">{thread.first_name ? `${thread.first_name} ${thread.last_name || ''}`.trim() : thread.username} • {thread.category_label}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone[thread.status] || statusTone.open}`}>{thread.status}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),320px]">
        <section className="card-surface p-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-sm text-muted">
            <Headset size={16} />
            Thread #{String(thread.id).slice(0, 8)} • Started {dateTime(thread.created_at)}
          </div>
          <div className="mt-4 space-y-3 rounded-[28px] bg-black/10 p-3">
            {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-cardSoft p-3">
            <p className="text-sm font-semibold text-text">Reply to user</p>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={4}
              placeholder="Type your reply"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-card px-4 py-3 text-sm text-text outline-none placeholder:text-muted"
            />
            <div className="mt-3 flex justify-end">
              <button onClick={() => replyMutation.mutate()} disabled={replyMutation.isPending || !replyMessage.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">
                <Send size={15} />
                {replyMutation.isPending ? 'Sending...' : 'Send reply'}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Thread controls</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl bg-cardSoft p-3 text-sm text-muted">
                <p className="text-xs uppercase tracking-wide text-muted">Member</p>
                <p className="mt-1 font-semibold text-text">{thread.first_name ? `${thread.first_name} ${thread.last_name || ''}`.trim() : thread.username}</p>
                <p className="mt-1 break-all text-xs">{thread.email}</p>
              </div>
              <div className="rounded-2xl bg-cardSoft p-3 text-sm text-muted">
                <p className="text-xs uppercase tracking-wide text-muted">Category</p>
                <p className="mt-1 font-semibold text-text">{thread.category_label}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
                  <option value="open">Open</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
                <button onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending} className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-text disabled:opacity-60">
                  {statusMutation.isPending ? 'Saving...' : 'Update status'}
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
