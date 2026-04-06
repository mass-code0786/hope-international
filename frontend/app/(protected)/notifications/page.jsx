'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, ChevronRight, Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '@/lib/services/notificationsService';
import { dateTime, formatLabel } from '@/lib/utils/format';

function notificationVariant(type) {
  if (type === 'deposit' || type === 'income') return 'success';
  if (type === 'withdrawal') return 'warning';
  if (type === 'support') return 'accent';
  if (type === 'auction') return 'warning';
  return 'default';
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      <div className="card-surface border border-white/10 p-6">
        <div className="h-6 w-44 rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-72 rounded-full bg-white/5" />
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-[28px] border border-white/10 bg-[rgba(19,21,27,0.9)] p-4">
          <div className="h-4 w-40 rounded-full bg-white/10" />
          <div className="mt-3 h-3 w-full rounded-full bg-white/5" />
          <div className="mt-2 h-3 w-3/4 rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(page),
    queryFn: () => getMyNotifications({ page, limit: 20 })
  });

  const markOneMutation = useMutation({
    mutationFn: (notificationId) => markNotificationAsRead(notificationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Unable to mark notification as read')
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: async (result) => {
      toast.success(result.message || 'All notifications marked as read');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications(page) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Unable to update notifications')
  });

  if (notificationsQuery.isLoading) return <NotificationSkeleton />;
  if (notificationsQuery.isError) return <ErrorState message="Notifications could not be loaded." onRetry={notificationsQuery.refetch} />;

  const envelope = notificationsQuery.data || {};
  const notifications = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};
  const summary = envelope.summary || {};
  const unreadCount = Number(summary.unread_count || 0);
  const totalCount = Number(summary.total_count || notifications.length || 0);

  async function handleOpenNotification(item) {
    if (!item) return;

    if (!item.is_read) {
      await markOneMutation.mutateAsync(item.id).catch(() => null);
    }

    if (item.route) {
      router.push(item.route);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle="Deposit reviews, wallet credits, auction results, order updates, support replies, and broadcasts appear here."
        action={(
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || unreadCount <= 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={15} />
            {markAllMutation.isPending ? 'Updating...' : 'Mark all as read'}
          </button>
        )}
      />

      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(27,30,38,0.98),rgba(17,18,24,0.98))] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[rgba(56,189,248,0.14)] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[rgba(245,158,11,0.12)] blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#f8fafc]">
              <Bell size={20} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">Notification Center</p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-white">Stay on top of account activity</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Unread</p>
              <p className="mt-1 text-2xl font-semibold">{unreadCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Total</p>
              <p className="mt-1 text-2xl font-semibold">{totalCount}</p>
            </div>
          </div>
        </div>
      </section>

      {!notifications.length ? (
        <EmptyState title="No notifications yet" description="Approved deposits, income credits, auction results, order updates, and support replies will appear here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const clickable = Boolean(item.route);
            return (
              <article
                key={item.id}
                className={`rounded-[28px] border p-4 transition-colors ${item.is_read ? 'border-white/10 bg-[rgba(19,21,27,0.88)]' : 'border-[rgba(56,189,248,0.28)] bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(12,16,24,0.98))] shadow-[0_18px_45px_rgba(7,10,16,0.32)]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={notificationVariant(item.type)}>{formatLabel(item.type)}</Badge>
                      {!item.is_read ? <span className="inline-flex items-center rounded-full bg-[rgba(56,189,248,0.18)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#bae6fd]">Unread</span> : null}
                    </div>
                    <h3 className="mt-3 text-base font-semibold tracking-[-0.03em] text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/72">{item.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
                      <span>{dateTime(item.created_at)}</span>
                      {item.route ? <span className="inline-flex items-center gap-1 text-white/60">Open route <ChevronRight size={12} /></span> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!item.is_read ? (
                      <button
                        type="button"
                        onClick={() => markOneMutation.mutate(item.id)}
                        disabled={markOneMutation.isPending}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white"
                      >
                        Mark read
                      </button>
                    ) : null}
                    {clickable ? (
                      <button
                        type="button"
                        onClick={() => handleOpenNotification(item)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                        aria-label="Open notification target"
                      >
                        <Sparkles size={15} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(pagination.totalPages || 1) > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={(pagination.page || 1) <= 1}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-white/60">Page {pagination.page || 1} of {pagination.totalPages || 1}</span>
          <button
            type="button"
            onClick={() => setPage((current) => ((pagination.totalPages || 1) > current ? current + 1 : current))}
            disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
