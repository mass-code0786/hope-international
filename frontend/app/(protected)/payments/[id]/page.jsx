'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Copy, RefreshCw } from 'lucide-react';
import { DepositSuccessCelebration, hasSeenDepositSuccess, isDepositSuccessStatus, markDepositSuccessSeen } from '@/components/payments/DepositSuccessCelebration';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { getPaymentDetail, syncPaymentDetail } from '@/lib/services/paymentsService';
import { currency, dateTime, number } from '@/lib/utils/format';

function statusMeta(status) {
  const normalized = String(status || 'awaiting_payment').trim().toLowerCase();
  if (normalized === 'finished') return { label: 'Finished', variant: 'success', description: 'Payment finished and wallet credit was applied.' };
  if (normalized === 'confirmed') return { label: 'Confirmed', variant: 'success', description: 'Payment confirmed and wallet credit was applied.' };
  if (normalized === 'completed') return { label: 'Completed', variant: 'success', description: 'Payment confirmed and wallet credited.' };
  if (normalized === 'confirming') return { label: 'Confirming', variant: 'warning', description: 'Blockchain confirmation is in progress.' };
  if (normalized === 'failed') return { label: 'Failed', variant: 'danger', description: 'Payment failed and no wallet credit was applied.' };
  if (normalized === 'expired') return { label: 'Expired', variant: 'danger', description: 'Payment expired before completion.' };
  if (normalized === 'partially_paid') return { label: 'Partially Paid', variant: 'warning', description: 'A partial payment was detected. Complete the exact amount to finish.' };
  return { label: 'Awaiting Payment', variant: 'accent', description: 'Send the exact amount to the generated address.' };
}

function Countdown({ expiresAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const text = (() => {
    if (!expiresAt) return '--:--';
    const remainingMs = new Date(expiresAt).getTime() - now;
    if (remainingMs <= 0) return '00:00';
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  })();

  return <span>{text}</span>;
}

function formatProviderPayable(payment) {
  const payAmount = Number(payment?.pay_amount ?? 0);
  const payCurrency = String(payment?.pay_currency || '').trim().toUpperCase();
  if (payAmount > 0 && payCurrency) {
    return `${number(payAmount)} ${payCurrency}`;
  }

  const totalPayableAmount = Number(payment?.total_payable_amount ?? payment?.price_amount ?? 0);
  return totalPayableAmount > 0 ? currency(totalPayableAmount) : '-';
}

export default function PaymentStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = params?.id;
  const returnTo = searchParams.get('returnTo') || '';
  const [qrImage, setQrImage] = useState('');
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);

  const paymentQuery = useQuery({
    queryKey: queryKeys.paymentDetail(paymentId),
    queryFn: () => getPaymentDetail(paymentId),
    enabled: Boolean(paymentId),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.payment_status;
      return ['confirmed', 'finished', 'failed', 'expired'].includes(String(status || '').toLowerCase()) ? false : 10000;
    }
  });

  const syncMutation = useMutation({
    mutationFn: () => syncPaymentDetail(paymentId),
    onSuccess: () => {
      toast.success('Payment status refreshed');
      paymentQuery.refetch();
    },
    onError: (error) => toast.error(error.message || 'Unable to refresh payment status')
  });

  const payment = paymentQuery.data?.data || null;
  const paymentExpired = Boolean(payment?.is_expired) || String(payment?.user_facing_status || '').toLowerCase() === 'expired';

  useEffect(() => {
    if (!payment?.id) return;
    if (!isDepositSuccessStatus(payment.payment_status)) return;
    if (hasSeenDepositSuccess(payment.id)) return;

    markDepositSuccessSeen(payment.id);
    setShowSuccessCelebration(true);
  }, [payment?.id, payment?.payment_status]);

  useEffect(() => {
    let cancelled = false;
    if (!payment?.pay_address || paymentExpired) {
      setQrImage('');
      return undefined;
    }

    QRCode.toDataURL(payment.pay_address, { width: 220, margin: 1 })
      .then((value) => {
        if (!cancelled) setQrImage(value);
      })
      .catch(() => {
        if (!cancelled) setQrImage('');
      });

    return () => {
      cancelled = true;
    };
  }, [payment?.pay_address, paymentExpired]);

  if (paymentQuery.isLoading) {
    return <div className="rounded-3xl border border-white/10 bg-card p-5 text-sm text-muted">Loading payment status...</div>;
  }

  if (paymentQuery.isError) {
    return <ErrorState message="Payment status could not be loaded." onRetry={paymentQuery.refetch} />;
  }
  const meta = statusMeta(payment?.user_facing_status);

  return (
    <div className="space-y-4">
      <DepositSuccessCelebration
        open={showSuccessCelebration}
        paymentId={payment?.id}
        amount={Number(payment?.deposit_amount || payment?.requested_amount || 0)}
        walletHref="/wallet"
        onClose={() => setShowSuccessCelebration(false)}
      />

      <SectionHeader
        title="Payment Status"
        subtitle="Track your NOWPayments deposit and wait for the wallet credit confirmation."
        action={(
          <div className="flex items-center gap-2">
            {returnTo ? <Link href={returnTo} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">Return</Link> : null}
            <Link href="/deposit" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">New Deposit</Link>
          </div>
        )}
      />

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#15213f_0%,#0b1220_55%,#070b14_100%)] p-5 text-white shadow-[0_16px_40px_rgba(2,6,23,0.45)]">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || paymentExpired}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
            >
              <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="mt-5 flex justify-center rounded-3xl border border-white/10 bg-white p-4">
            {qrImage ? <img src={qrImage} alt="Payment QR code" className="h-[220px] w-[220px] object-contain" /> : <div className="flex h-[220px] w-[220px] items-center justify-center text-center text-sm text-slate-500">{paymentExpired ? 'Payment expired' : 'No payment address available'}</div>}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Payment Timer</p>
            <p className="mt-2 text-lg font-semibold text-white"><Countdown expiresAt={payment?.expires_at} /></p>
            <p className="mt-2 text-slate-200">{meta.description}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Deposit Amount</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{currency(payment?.deposit_amount || payment?.requested_amount || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Amount To Pay</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{formatProviderPayable(payment)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Gateway Difference</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{Number(payment?.fee_amount || 0) > 0 ? currency(payment.fee_amount) : 'None'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Address</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-950">{paymentExpired ? 'Expired payment address' : (payment?.pay_address || 'No payment address available')}</p>
            {payment?.pay_address && !paymentExpired ? (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(payment.pay_address);
                  toast.success('Payment address copied');
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <Copy size={14} /> Copy Address
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Provider Reference</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-950">{payment?.provider_payment_id || payment?.id}</p>
            <p className="mt-2 text-xs text-slate-500">Created {payment?.created_at ? dateTime(payment.created_at) : '-'}</p>
            <p className="mt-2 text-xs text-slate-500">Network {payment?.network || 'BSC/BEP20'} | Coin USDT</p>
          </div>
        </div>
      </section>
    </div>
  );
}
