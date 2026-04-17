'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { createNowPaymentsPayment } from '@/lib/services/paymentsService';
import { getDepositHistory } from '@/lib/services/walletService';
import { currency, dateTime, number, statusVariant } from '@/lib/utils/format';

const NOWPAYMENTS_PAY_CURRENCY = 'usdt';
const NOWPAYMENTS_NETWORK = 'BSC/BEP20';
const COUNTDOWN_INTERVAL_MS = 1000;

function extractLatestActiveGatewayPayment(items = []) {
  return items.find((item) => item.payment_provider === 'nowpayments' && !item.is_processed && String(item.payment_status || '').toLowerCase() !== 'expired')
    || items.find((item) => item.payment_provider === 'nowpayments' && item.payment_status)
    || null;
}

function getExpiryState(expiresAt) {
  if (!expiresAt) {
    return { expired: false, label: '--:--', remainingMs: null };
  }

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return { expired: true, label: '00:00', remainingMs: 0 };
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    expired: false,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    remainingMs
  };
}

function formatProviderPayable(payment) {
  const payAmount = Number(payment?.exact_payable_amount ?? payment?.pay_amount ?? 0);
  const payCurrency = String(payment?.exact_payable_currency || payment?.pay_currency || '').trim().toUpperCase();
  if (payAmount > 0 && payCurrency) {
    return `${number(payAmount)} ${payCurrency}`;
  }

  const totalPayableAmount = Number(payment?.total_payable_amount ?? payment?.amount ?? 0);
  return totalPayableAmount > 0 ? currency(totalPayableAmount) : 'Waiting';
}

export default function DepositPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const [qrImage, setQrImage] = useState('');
  const [activeGatewayPayment, setActiveGatewayPayment] = useState(null);
  const [countdownTick, setCountdownTick] = useState(Date.now());
  const returnTo = searchParams.get('returnTo') || '';
  const amountPreset = searchParams.get('amount') || '';

  const depositsQuery = useQuery({
    queryKey: queryKeys.walletDeposits,
    queryFn: getDepositHistory,
    refetchInterval: (query) => {
      const items = Array.isArray(query.state.data?.data) ? query.state.data.data : [];
      const hasPendingGatewayDeposit = items.some((item) => item.payment_provider === 'nowpayments' && !item.is_processed && String(item.payment_status || '').toLowerCase() !== 'expired');
      return hasPendingGatewayDeposit || activeGatewayPayment ? 10000 : false;
    }
  });

  const nowPaymentsMutation = useMutation({
    mutationFn: createNowPaymentsPayment,
    onSuccess: async (result) => {
      formRef.current?.reset();
      const createdDeposit = result?.data?.depositRequest || result?.data || null;
      const createdPayment = result?.data?.payment || null;
      if (createdDeposit) {
        setActiveGatewayPayment({
          ...createdDeposit,
          payment_record_id: createdDeposit.payment_record_id || createdPayment?.id || null
        });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.walletDeposits });
      toast.success(result.message || 'Crypto payment created successfully');
      if (createdPayment?.id) {
        const suffix = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
        router.push(`/payments/${createdPayment.id}${suffix}`);
      }
    },
    onError: (error) => toast.error(error.message || 'Crypto payment creation failed')
  });

  const depositsEnvelope = depositsQuery.data || {};
  const deposits = Array.isArray(depositsEnvelope.data) ? depositsEnvelope.data : [];
  const latestActiveGatewayPayment = useMemo(() => extractLatestActiveGatewayPayment(deposits), [deposits]);

  useEffect(() => {
    if (!activeGatewayPayment && latestActiveGatewayPayment) {
      setActiveGatewayPayment(latestActiveGatewayPayment);
      return;
    }

    if (!activeGatewayPayment?.id) return;

    const refreshed = deposits.find((item) => item.id === activeGatewayPayment.id);
    if (refreshed) {
      setActiveGatewayPayment(refreshed);
    }
  }, [activeGatewayPayment, deposits, latestActiveGatewayPayment]);

  useEffect(() => {
    let cancelled = false;
    const expiryState = getExpiryState(activeGatewayPayment?.expires_at);
    const qrTarget = expiryState.expired ? '' : (activeGatewayPayment?.pay_address || '');
    if (!qrTarget) {
      setQrImage('');
      return undefined;
    }

    QRCode.toDataURL(qrTarget, { width: 280, margin: 1 })
      .then((value) => {
        if (!cancelled) setQrImage(value);
      })
      .catch(() => {
        if (!cancelled) setQrImage('');
      });

    return () => {
      cancelled = true;
    };
  }, [activeGatewayPayment?.pay_address, activeGatewayPayment?.expires_at]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownTick(Date.now());
    }, COUNTDOWN_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const expiryState = useMemo(() => getExpiryState(activeGatewayPayment?.expires_at), [activeGatewayPayment?.expires_at, countdownTick]);
  const activePaymentExpired = Boolean(activeGatewayPayment) && expiryState.expired && !activeGatewayPayment?.is_processed;
  const paymentSummary = {
    depositAmount: Number(activeGatewayPayment?.deposit_amount ?? activeGatewayPayment?.amount ?? 0),
    providerDifferenceAmount: Number(activeGatewayPayment?.fee_amount ?? 0),
    totalPayableAmount: Number(activeGatewayPayment?.total_payable_amount ?? activeGatewayPayment?.amount ?? 0)
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Crypto Deposit"
        action={(
          <div className="flex items-center gap-2">
            {returnTo ? <Link href={returnTo} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">Back</Link> : null}
            <Link href="/history/deposit" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">History</Link>
          </div>
        )}
      />

      <section className="rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top,#15213f_0%,#0b1220_55%,#070b14_100%)] p-4 text-white shadow-[0_16px_40px_rgba(2,6,23,0.45)]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">NOWPayments</Badge>
          <Badge variant="success">Automatic Credit</Badge>
          {activeGatewayPayment?.payment_status ? <Badge variant={activePaymentExpired ? 'danger' : 'warning'}>{activePaymentExpired ? 'expired' : activeGatewayPayment.payment_status}</Badge> : null}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex justify-center">
            {qrImage ? (
              <img src={qrImage} alt="Deposit QR code" className="h-56 w-56 rounded-2xl border border-white/10 bg-white p-3 object-contain shadow-lg" />
            ) : (
              <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-sm text-slate-300">
                Create a payment to generate QR
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Coin</p>
                <p className="mt-2 text-lg font-semibold text-white">USDT</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Network</p>
                <p className="mt-2 text-lg font-semibold text-white">{activeGatewayPayment?.network || NOWPAYMENTS_NETWORK}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Deposit Amount</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {paymentSummary.depositAmount ? currency(paymentSummary.depositAmount) : 'Waiting'}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 shadow-[0_0_30px_rgba(34,197,94,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/78">Exact Amount To Pay</p>
                <p className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
                  {formatProviderPayable(activeGatewayPayment)}
                </p>
                <p className="mt-2 text-[11px] text-emerald-50/86">Send the exact amount shown below to avoid partial payment.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Gateway Difference</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {paymentSummary.providerDifferenceAmount > 0 ? currency(paymentSummary.providerDifferenceAmount) : 'None'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Payment Address</p>
              <p className="mt-2 break-all text-sm font-semibold text-white">
                {activePaymentExpired ? 'Expired payment address' : (activeGatewayPayment?.pay_address || 'Create a NOWPayments deposit to get a crypto address')}
              </p>
              {!activePaymentExpired && activeGatewayPayment?.exact_payable_amount ? (
                <p className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                  Exact amount: {formatProviderPayable(activeGatewayPayment)}
                </p>
              ) : null}
              {activeGatewayPayment?.pay_address && !activePaymentExpired ? (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(activeGatewayPayment.pay_address);
                    toast.success('Payment address copied');
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-slate-100"
                >
                  <Copy size={14} /> Copy Address
                </button>
              ) : null}
              {activeGatewayPayment?.payment_record_id && !activePaymentExpired ? (
                <Link
                  href={`/payments/${activeGatewayPayment.payment_record_id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                  className="mt-3 ml-2 inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-slate-100"
                >
                  Open Status Page
                </Link>
              ) : null}
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Status</p>
                <p className="text-lg font-semibold text-white">{expiryState.label}</p>
              </div>
              <p className="mt-2 text-sm text-emerald-50">
                {activeGatewayPayment
                  ? activePaymentExpired
                    ? 'This payment has expired. Create a new payment to continue.'
                    : activeGatewayPayment.is_processed
                    ? 'Payment confirmed and credited to your deposit wallet.'
                    : 'Waiting for payment confirmation. This section refreshes automatically.'
                  : 'No active NOWPayments deposit yet.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const amount = Number(formData.get('amount') || 0);

          nowPaymentsMutation.mutate({
            amount,
            payCurrency: NOWPAYMENTS_PAY_CURRENCY,
            network: NOWPAYMENTS_NETWORK
          });
        }}
        className="space-y-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Payment</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">USDT on BSC/BEP20</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="deposit-amount" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Amount (USD)</label>
            <input id="deposit-amount" name="amount" type="number" min="1" step="0.01" defaultValue={amountPreset} placeholder="Enter deposit amount" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
          </div>
        </div>

        <button disabled={nowPaymentsMutation.isPending} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {nowPaymentsMutation.isPending ? 'Processing...' : 'Deposit'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600">Latest NOWPayments Deposits</div>
        {depositsQuery.isError ? (
          <div className="p-3"><ErrorState message="Deposit history could not be loaded." onRetry={depositsQuery.refetch} /></div>
        ) : !deposits.length ? (
          <div className="p-3"><EmptyState title="No deposits yet" description="Your NOWPayments deposits will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deposits.slice(0, 10).map((item) => (
              <div key={item.id} className="space-y-1 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                  <Badge variant={statusVariant(item.is_processed ? 'completed' : item.status)}>{item.is_processed ? 'completed' : item.status}</Badge>
                </div>
                <p className="text-[11px] font-medium text-slate-600">
                  NOWPayments
                  {' | '}
                  {String(item.network || NOWPAYMENTS_NETWORK).toUpperCase()}
                  {' | '}
                  {dateTime(item.created_at)}
                </p>
                <div className="text-[11px] text-slate-700">
                  <p>
                    Status: {(item.payment_status || 'waiting').toUpperCase()}
                    {item.pay_amount ? ` | Pay ${number(item.pay_amount)} ${(item.pay_currency || '').toUpperCase()}` : ''}
                  </p>
                  {item.payment_record_id ? <Link href={`/payments/${item.payment_record_id}`} className="mt-1 inline-flex font-semibold text-sky-700">Open payment status</Link> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
