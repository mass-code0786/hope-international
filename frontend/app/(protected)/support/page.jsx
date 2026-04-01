'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headset, MessageSquarePlus, Send, Sparkles, X } from 'lucide-react';
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
import { SupportChatBubble } from '@/components/support/SupportChatBubble';
import { SupportThreadList } from '@/components/support/SupportThreadList';

function Stat({ value, label }) {
  return (
    <div className="hope-grid-card rounded-[24px] p-3.5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">{value}</p>
    </div>
  );
}

function getCreateFormErrors(form) {
  const errors = {};
  if (!String(form.subject || '').trim()) errors.subject = 'Subject is required';
  if (!String(form.message || '').trim()) errors.message = 'Message is required';
  return errors;
}

function SupportComposer({
  open,
  form,
  errors,
  isSubmitting,
  onChange,
  onClose,
  onSubmit
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/50 backdrop-blur-sm sm:items-center sm:justify-center">
      <button type="button" aria-label="Close support request composer" className="absolute inset-0" onClick={onClose} />
      <section className="relative z-10 w-full rounded-t-[28px] border border-[var(--hope-border)] bg-[color:var(--hope-surface-strong)] p-4 shadow-[0_-12px_40px_rgba(15,23,42,0.28)] sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">New support request</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-text">Create a support ticket</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Send the subject and message here, then continue the conversation in the ticket thread.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-cardSoft text-muted transition hover:bg-card hover:text-text">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <input
              value={form.subject}
              onChange={(e) => onChange('subject', e.target.value)}
              placeholder="Ticket subject"
              className={`hope-input ${errors.subject ? 'border-rose-400 focus:border-rose-500' : ''}`}
            />
            {errors.subject ? <p className="mt-1 text-xs font-medium text-rose-600">{errors.subject}</p> : null}
          </div>

          <div>
            <select value={form.category} onChange={(e) => onChange('category', e.target.value)} className="hope-select">
              {supportCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div>
            <textarea
              value={form.message}
              onChange={(e) => onChange('message', e.target.value)}
              rows={6}
              placeholder="Describe the issue clearly so support can help faster"
              className={`hope-textarea ${errors.message ? 'border-rose-400 focus:border-rose-500' : ''}`}
            />
            {errors.message ? <p className="mt-1 text-xs font-medium text-rose-600">{errors.message}</p> : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full border border-[var(--hope-border)] bg-cardSoft px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-card">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="hope-button justify-center disabled:opacity-60">
              <Sparkles size={16} />
              {isSubmitting ? 'Sending...' : 'Create support request'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ subject: '', category: 'order_issue', message: '' });
  const [createErrors, setCreateErrors] = useState({});
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
    mutationFn: (payload) => createMySupportThread(payload),
    onSuccess: async (result) => {
      const threadId = result?.data?.thread?.id || '';
      toast.success(result.message || 'Support request sent');
      setCreateForm({ subject: '', category: 'order_issue', message: '' });
      setCreateErrors({});
      setIsComposerOpen(false);
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

  function openComposer(prefill = {}) {
    setCreateForm((prev) => ({ ...prev, ...prefill }));
    setCreateErrors({});
    setIsComposerOpen(true);
  }

  function closeComposer() {
    if (createMutation.isPending) return;
    setCreateErrors({});
    setIsComposerOpen(false);
  }

  function updateCreateForm(key, value) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    setCreateErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    const errors = getCreateFormErrors(createForm);
    if (Object.keys(errors).length) {
      setCreateErrors(errors);
      toast.error('Subject and message are required');
      return;
    }

    await createMutation.mutateAsync({
      subject: createForm.subject.trim(),
      category: createForm.category,
      message: createForm.message.trim()
    });
  }

  if (threadsQuery.isLoading) return <div className="card-surface p-6 text-sm text-muted">Loading support...</div>;
  if (threadsQuery.isError) return <ErrorState message="Support inbox could not be loaded." onRetry={threadsQuery.refetch} />;

  return (
    <>
      <div className="space-y-4">
        <SectionHeader title="Support" subtitle="A cleaner member helpdesk with ticket history, live thread context, and mobile-friendly message controls." />

        <div className="grid grid-cols-3 gap-3">
          <Stat value={Number(summary.open_threads || 0)} label="Open" />
          <Stat value={Number(summary.replied_threads || 0)} label="Replied" />
          <Stat value={Number(summary.closed_threads || 0)} label="Closed" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[340px,minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">New support request</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-text">Create a new ticket</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">Open a fresh thread for payment, account, order, seller, or auction support.</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent"><MessageSquarePlus size={16} /></span>
              </div>
              <div className="mt-4">
                <button type="button" onClick={() => openComposer()} className="hope-button w-full justify-center">
                  <Sparkles size={16} />
                  Create support request
                </button>
              </div>
            </section>

            <section className="card-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Your tickets</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-text">Support history</h2>
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-full border border-[var(--hope-border)] bg-cardSoft px-3 py-2 text-[11px] font-semibold text-muted outline-none">
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="mt-4">
                {!threads.length ? (
                  <EmptyState
                    title="No tickets yet"
                    description="Create your first support request and the conversation will appear here."
                    action={<button type="button" onClick={() => openComposer()} className="hope-button">Create your first support request</button>}
                  />
                ) : (
                  <SupportThreadList threads={threads} selectedThreadId={selectedThreadId} onSelect={setSelectedThreadId} />
                )}
              </div>
            </section>
          </div>

          <section className="card-surface flex min-h-[520px] flex-col p-0">
            {!selectedThreadId ? (
              <div className="p-4">
                <EmptyState
                  title="Open a conversation"
                  description="Pick a ticket from the left or create a new support request to start chatting with the Hope support team."
                  action={<button type="button" onClick={() => openComposer()} className="hope-button">Create support request</button>}
                />
              </div>
            ) : null}
            {selectedThreadId && detailQuery.isLoading ? <div className="p-4 text-sm text-muted">Loading conversation...</div> : null}
            {selectedThreadId && detailQuery.isError ? <div className="p-4"><ErrorState message="Support conversation could not be loaded." onRetry={detailQuery.refetch} /></div> : null}
            {selectedThreadId && activeThread ? (
              <>
                <div className="border-b border-[var(--hope-border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--hope-border)] bg-cardSoft px-3 py-1 text-[11px] font-semibold text-muted"><Headset size={14} /> Support Team</div>
                      <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-text">{activeThread.subject}</h2>
                      <p className="mt-1 text-sm text-muted">{activeThread.category_label || activeThread.category} | {activeThread.status || 'open'} ticket</p>
                    </div>
                    <Link href="/shop" className="text-sm font-medium text-muted underline decoration-[var(--hope-border)] underline-offset-4">Back to shop</Link>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3 rounded-[28px] bg-[linear-gradient(180deg,rgba(248,250,252,0.88),rgba(238,244,248,0.9))] p-3 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.88))]">
                    {!messages.length ? <EmptyState title="No messages yet" description="Send your first message below and the support team will reply in this thread." /> : null}
                    {messages.map((message) => <SupportChatBubble key={message.id} message={message} />)}
                  </div>
                </div>

                <div className="sticky bottom-0 border-t border-[var(--hope-border)] bg-[color:var(--hope-surface-strong)] p-3 backdrop-blur">
                  <div className="rounded-[26px] border border-[var(--hope-border)] bg-cardSoft p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text">Reply to this ticket</p>
                      {activeThread.status === 'closed' ? <p className="text-[11px] text-muted">Sending a new message will reopen this conversation.</p> : null}
                    </div>
                    <textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} rows={3} placeholder="Type your message" className="hope-textarea mt-3" />
                    <div className="mt-3 flex items-center justify-end gap-3">
                      <button onClick={() => messageMutation.mutate()} disabled={messageMutation.isPending || !replyMessage.trim()} className="hope-button disabled:opacity-60">
                        <Send size={15} />
                        {messageMutation.isPending ? 'Sending...' : 'Send message'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>

      <SupportComposer
        open={isComposerOpen}
        form={createForm}
        errors={createErrors}
        isSubmitting={createMutation.isPending}
        onChange={updateCreateForm}
        onClose={closeComposer}
        onSubmit={handleCreateSubmit}
      />
    </>
  );
}
