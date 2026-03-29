'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headset, Plus, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  createMySupportThread,
  getMySupportThread,
  getMySupportThreads,
  sendMySupportMessage,
  supportCategoryOptions
} from '@/lib/services/supportService';
import { dateTime } from '@/lib/utils/format';

const statusTone = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  replied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200'
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone[status] || statusTone.open}`}>
      {status || 'open'}
    </span>
  );
}

function MessageBubble({ message }) {
  const mine = message.sender_type === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-[24px] px-4 py-3 shadow-sm ${mine ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
        <p className={`text-[11px] font-semibold ${mine ? 'text-white/80' : 'text-slate-900'}`}>{mine ? 'You' : message.sender_display_name || 'Support team'}</p>
        <p className={`mt-1 text-sm leading-6 ${mine ? 'text-white' : 'text-slate-600'}`}>{message.message}</p>
        <p className={`mt-2 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{dateTime(message.created_at)}</p>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [createForm, setCreateForm] = useState({ subject: '', category: 'order_issue', message: '' });
  const [replyMessage, setReplyMessage] = useState('');

  const threadsQuery = useQuery({
    queryKey: [...queryKeys.supportThreads, statusFilter],
    queryFn: () => getMySupportThreads({ status: statusFilter, page: 1, limit: 30 })
  });

  const threads = useMemo(() => (Array.isArray(threadsQuery.data?.data) ? threadsQuery.data.data : []), [threadsQuery.data]);
  const summary = threadsQuery.data?.summary || {};

  useEffect(() => {
    if (!threads.length) {
      setSelectedThreadId('');
      return;
    }
    if (!selectedThreadId || !threads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(threads[0].id);
    }
  }, [selectedThreadId, threads]);

  const detailQuery = useQuery({
    queryKey: queryKeys.supportThreadDetail(selectedThreadId),
    queryFn: () => getMySupportThread(selectedThreadId),
    enabled: Boolean(selectedThreadId)
  });

  const refreshSupport = async (threadId = '') => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.supportThreads });
    if (threadId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.supportThreadDetail(threadId) });
    }
  };

  const createMutation = useMutation({
    mutationFn: () => createMySupportThread(createForm),
    onSuccess: async (result) => {
      const threadId = result?.data?.thread?.id || '';
      toast.success(result.message || 'Support request sent');
      setCreateForm({ subject: '', category: 'order_issue', message: '' });
      if (threadId) setSelectedThreadId(threadId);
      await refreshSupport(threadId);
    },
    onError: (error) => toast.error(error.message || 'Unable to create support request')
  });

  const messageMutation = useMutation({
    mutationFn: () => sendMySupportMessage(selectedThreadId, { message: replyMessage }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Message sent');
      setReplyMessage('');
      await refreshSupport(selectedThreadId || result?.data?.thread?.id || '');
    },
    onError: (error) => toast.error(error.message || 'Unable to send message')
  });

  const activeDetail = detailQuery.data?.data || null;
  const activeThread = activeDetail?.thread || null;
  const messages = Array.isArray(activeDetail?.messages) ? activeDetail.messages : [];

  if (threadsQuery.isLoading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading support...</div>;
  }

  if (threadsQuery.isError) {
    return <ErrorState message="Support inbox could not be loaded." onRetry={threadsQuery.refetch} />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Support" subtitle="Send a question to the Hope support team and follow replies here." />

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] text-slate-500">Open</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{Number(summary.open_threads || 0)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] text-slate-500">Replied</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{Number(summary.replied_threads || 0)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] text-slate-500">Closed</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{Number(summary.closed_threads || 0)}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px,minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">New support request</p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">Start a conversation</h2>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <Plus size={16} />
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={createForm.subject}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Subject"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
              />
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
              >
                {supportCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <textarea
                value={createForm.message}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={4}
                placeholder="Describe the issue you need help with"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
              />
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] disabled:opacity-60"
              >
                <Sparkles size={16} />
                {createMutation.isPending ? 'Sending...' : 'Send to support'}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Your conversations</p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">Support history</h2>
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 outline-none">
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="mt-4 space-y-2">
              {!threads.length ? <EmptyState title="No conversations yet" description="Start a new support request and your conversation will appear here." /> : null}
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${selectedThreadId === thread.id ? 'border-slate-900 bg-slate-900 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${selectedThreadId === thread.id ? 'text-white' : 'text-slate-900'}`}>{thread.subject}</p>
                      <p className={`mt-1 text-[11px] ${selectedThreadId === thread.id ? 'text-white/80' : 'text-slate-500'}`}>{thread.category_label}</p>
                    </div>
                    <StatusBadge status={thread.status} />
                  </div>
                  <p className={`mt-3 line-clamp-2 text-xs leading-5 ${selectedThreadId === thread.id ? 'text-white/80' : 'text-slate-500'}`}>{thread.last_message || 'No messages yet'}</p>
                  <div className={`mt-3 flex items-center justify-between text-[10px] ${selectedThreadId === thread.id ? 'text-white/70' : 'text-slate-400'}`}>
                    <span>{thread.message_count} messages</span>
                    <span>{dateTime(thread.updated_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          {!selectedThreadId ? (
            <EmptyState title="Open a conversation" description="Pick a support thread from the left or start a new request." />
          ) : null}
          {selectedThreadId && detailQuery.isLoading ? <p className="text-sm text-slate-500">Loading conversation...</p> : null}
          {selectedThreadId && detailQuery.isError ? <ErrorState message="Support conversation could not be loaded." onRetry={detailQuery.refetch} /> : null}
          {selectedThreadId && activeThread ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    <Headset size={14} />
                    Hope support
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">{activeThread.subject}</h2>
                  <p className="mt-1 text-sm text-slate-500">{activeThread.category_label} • Started {dateTime(activeThread.created_at)}</p>
                </div>
                <StatusBadge status={activeThread.status} />
              </div>

              <div className="space-y-3 rounded-[28px] bg-[linear-gradient(180deg,#f8fafc,#eef2ff)] p-3">
                {!messages.length ? <EmptyState title="No messages yet" description="Send your first message below." /> : null}
                {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Add a message</p>
                  {activeThread.status === 'closed' ? <p className="text-[11px] text-slate-500">Sending a new message will reopen this conversation.</p> : null}
                </div>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  placeholder="Type your message"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Link href="/shop" className="text-sm font-medium text-slate-500 underline decoration-slate-200 underline-offset-4">Back to shop</Link>
                  <button
                    onClick={() => messageMutation.mutate()}
                    disabled={messageMutation.isPending || !replyMessage.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Send size={15} />
                    {messageMutation.isPending ? 'Sending...' : 'Send message'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
