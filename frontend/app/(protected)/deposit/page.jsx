'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Copy, Upload } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { createNowPaymentsPayment } from '@/lib/services/paymentsService';
import { createDepositRequest, getDepositHistory, getDepositWalletConfig } from '@/lib/services/walletService';
import { compressImageFile } from '@/lib/utils/imageUpload';
import { currency, dateTime, statusVariant } from '@/lib/utils/format';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const AUTO_CRYPTO_OPTIONS = [
  { value: 'btc', label: 'BTC' },
  { value: 'eth', label: 'ETH' },
  { value: 'usdtbsc', label: 'USDT (BSC)' },
  { value: 'usdttrc20', label: 'USDT (TRC20)' },
  { value: 'usdterc20', label: 'USDT (ERC20)' },
  { value: 'ltc', label: 'LTC' }
];

function extractLatestActiveGatewayPayment(items = []) {
  return items.find((item) => item.payment_provider === 'nowpayments' && !item.is_processed)
    || items.find((item) => item.payment_provider === 'nowpayments' && item.payment_status)
    || null;
}

export default function DepositPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const [depositMode, setDepositMode] = useState(searchParams.get('provider') === 'manual' ? 'manual' : 'nowpayments');
  const [payCurrency, setPayCurrency] = useState(searchParams.get('coin') || 'usdtbsc');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [activeGatewayPayment, setActiveGatewayPayment] = useState(null);
  const returnTo = searchParams.get('returnTo') || '';
  const amountPreset = searchParams.get('amount') || '';

  const depositConfigQuery = useQuery({ queryKey: queryKeys.walletDepositConfig, queryFn: getDepositWalletConfig });
  const depositsQuery = useQuery({
    queryKey: queryKeys.walletDeposits,
    queryFn: getDepositHistory,
    refetchInterval: (query) => {
      const items = Array.isArray(query.state.data?.data) ? query.state.data.data : [];
      const hasPendingGatewayDeposit = items.some((item) => item.payment_provider === 'nowpayments' && !item.is_processed);
      return hasPendingGatewayDeposit || activeGatewayPayment ? 10000 : false;
    }
  });

  const depositMutation = useMutation({
    mutationFn: createDepositRequest,
    onSuccess: async (result) => {
      formRef.current?.reset();
      setProofImageUrl('');
      setProofFileName('');
      toast.success(result.message || 'Manual deposit submitted successfully');
      await queryClient.invalidateQueries({ queryKey: queryKeys.walletDeposits });
    },
    onError: (error) => toast.error(error.message || 'Deposit request failed')
  });

  const nowPaymentsMutation = useMutation({
    mutationFn: createNowPaymentsPayment,
    onSuccess: async (result) => {
      formRef.current?.reset();
      setProofImageUrl('');
      setProofFileName('');
      if (result?.data?.depositRequest) {
        setActiveGatewayPayment(result.data.depositRequest);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.walletDeposits });
      toast.success(result.message || 'Crypto payment created successfully');
      if (result?.data?.payment?.id) {
        const suffix = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
        router.push(`/payments/${result.data.payment.id}${suffix}`);
      }
    },
    onError: (error) => toast.error(error.message || 'Crypto payment creation failed')
  });

  const config = depositConfigQuery.data?.data || null;
  const depositsEnvelope = depositsQuery.data || {};
  const deposits = Array.isArray(depositsEnvelope.data) ? depositsEnvelope.data : [];
  const latestActiveGatewayPayment = useMemo(() => extractLatestActiveGatewayPayment(deposits), [deposits]);

  useEffect(() => {
    if (!activeGatewayPayment && latestActiveGatewayPayment) {
      setActiveGatewayPayment(latestActiveGatewayPayment);
      return;
    }

    if (!activeGatewayPayment?.id) {
      return;
    }

    const refreshed = deposits.find((item) => item.id === activeGatewayPayment.id);
    if (refreshed) {
      setActiveGatewayPayment(refreshed);
    }
  }, [activeGatewayPayment, deposits, latestActiveGatewayPayment]);

  useEffect(() => {
    let cancelled = false;
    const qrTarget = activeGatewayPayment?.pay_address || activeGatewayPayment?.wallet_address_snapshot || config?.walletAddress || '';
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
  }, [activeGatewayPayment?.pay_address, activeGatewayPayment?.wallet_address_snapshot, config?.walletAddress]);

  const manualDepositUnavailable = depositConfigQuery.isSuccess && (!config?.isActive || !config?.walletAddress);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Crypto Deposit"
        subtitle="Create an automatic crypto payment with NOWPayments or use the manual fallback if needed."
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
          {activeGatewayPayment?.payment_status ? <Badge variant="warning">{activeGatewayPayment.payment_status}</Badge> : null}
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">How It Works</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">
                Enter your deposit amount, choose a coin, and the system generates a live NOWPayments address. After network confirmation, your deposit wallet is credited automatically and the existing deposit income logic runs from the backend.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pay Amount</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {activeGatewayPayment?.pay_amount ? `${activeGatewayPayment.pay_amount} ${(activeGatewayPayment.pay_currency || '').toUpperCase()}` : 'Waiting'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Deposit Value</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {activeGatewayPayment?.amount ? currency(activeGatewayPayment.amount) : 'USD based'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Payment Address</p>
              <p className="mt-2 break-all text-sm font-semibold text-white">
                {activeGatewayPayment?.pay_address || 'Create a NOWPayments deposit to get a crypto address'}
              </p>
              {activeGatewayPayment?.pay_address ? (
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
              {activeGatewayPayment?.payment_record_id ? (
                <Link
                  href={`/payments/${activeGatewayPayment.payment_record_id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                  className="mt-3 ml-2 inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-slate-100"
                >
                  Open Status Page
                </Link>
              ) : null}
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Status</p>
              <p className="mt-2 text-sm text-emerald-50">
                {activeGatewayPayment
                  ? activeGatewayPayment.is_processed
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

          if (depositMode === 'manual') {
            if (!proofImageUrl) {
              toast.error('Screenshot proof is required');
              return;
            }
            depositMutation.mutate({
              provider: 'manual',
              amount,
              txHash: String(formData.get('txHash') || ''),
              proofImageUrl,
              note: String(formData.get('note') || '')
            });
            return;
          }

          nowPaymentsMutation.mutate({
            amount,
            payCurrency
          });
        }}
        className="space-y-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="deposit-mode" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Deposit Mode</label>
            <select
              id="deposit-mode"
              value={depositMode}
              onChange={(event) => setDepositMode(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="nowpayments">Automatic via NOWPayments</option>
              <option value="manual">Manual Proof Submission</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="deposit-amount" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Amount (USD)</label>
            <input id="deposit-amount" name="amount" type="number" min="1" step="0.01" defaultValue={amountPreset} placeholder="Enter deposit amount" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
          </div>
        </div>

        {depositMode === 'nowpayments' ? (
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="deposit-crypto" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Crypto Currency</label>
              <select
                id="deposit-crypto"
                value={payCurrency}
                onChange={(event) => setPayCurrency(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                {AUTO_CRYPTO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Automatic Settlement</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Deposit wallet credit starts only after NOWPayments sends a confirmed or finished payment webhook. No manual approval is required for this mode.
              </p>
            </div>
          </div>
        ) : (
          <>
            {depositConfigQuery.isError ? (
              <ErrorState message="Manual deposit wallet could not be loaded." onRetry={depositConfigQuery.refetch} />
            ) : manualDepositUnavailable ? (
              <ErrorState message="Manual deposit fallback is currently unavailable." onRetry={depositConfigQuery.refetch} />
            ) : (
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Asset</p>
                  <p className="mt-1 font-semibold text-slate-950">{config?.asset || 'USDT'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Network</p>
                  <p className="mt-1 font-semibold text-slate-950">{config?.network || 'BEP20'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Manual Wallet Address</p>
                  <p className="mt-1 break-all font-semibold text-slate-950">{config?.walletAddress || 'Unavailable'}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="deposit-tx-hash" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Transaction Hash</label>
              <input id="deposit-tx-hash" name="txHash" placeholder="Paste the blockchain transaction hash" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Screenshot Proof</p>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <span className="inline-flex items-center gap-2 font-medium text-slate-800"><Upload size={16} /> {proofFileName || 'Upload transaction screenshot (PNG/JPG/WEBP)'}</span>
                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">Choose File</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!ACCEPTED_TYPES.includes(file.type)) {
                      toast.error('Proof image must be PNG, JPG, or WEBP');
                      return;
                    }
                    if (file.size > MAX_FILE_SIZE_BYTES) {
                      toast.error('Proof image must be 5MB or smaller');
                      return;
                    }
                    try {
                      setIsUploadingProof(true);
                      const uploaded = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, mimeType: file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg' });
                      setProofImageUrl(uploaded);
                      setProofFileName(file.name);
                      toast.success('Proof image attached');
                    } catch (error) {
                      toast.error(error.message || 'Proof upload failed');
                    } finally {
                      setIsUploadingProof(false);
                      event.target.value = '';
                    }
                  }}
                />
              </label>
              {proofImageUrl ? <img src={proofImageUrl} alt="Proof preview" className="h-36 w-full rounded-2xl border border-slate-200 object-contain bg-white p-2" /> : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deposit-note" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Note</label>
              <textarea id="deposit-note" name="note" rows={3} placeholder="Optional note for admin verification" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
            </div>
          </>
        )}

        <button disabled={depositMutation.isPending || nowPaymentsMutation.isPending || isUploadingProof || (depositMode === 'manual' && manualDepositUnavailable)} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {depositMutation.isPending || nowPaymentsMutation.isPending
            ? 'Processing...'
            : depositMode === 'nowpayments'
              ? 'Create Crypto Payment'
              : 'Submit Manual Deposit'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600">Latest Deposits</div>
        {depositsQuery.isError ? (
          <div className="p-3"><ErrorState message="Deposit history could not be loaded." onRetry={depositsQuery.refetch} /></div>
        ) : !deposits.length ? (
          <div className="p-3"><EmptyState title="No deposits yet" description="Your manual and NOWPayments deposits will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deposits.slice(0, 10).map((item) => (
              <div key={item.id} className="space-y-1 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                  <Badge variant={statusVariant(item.is_processed ? 'completed' : item.status)}>{item.is_processed ? 'completed' : item.status}</Badge>
                </div>
                <p className="text-[11px] font-medium text-slate-600">
                  {(item.payment_provider === 'nowpayments' ? 'NOWPayments' : (item.asset || 'USDT'))}
                  {' • '}
                  {(item.pay_currency || item.network || 'BEP20').toUpperCase()}
                  {' • '}
                  {dateTime(item.created_at)}
                </p>
                {item.payment_provider === 'nowpayments' ? (
                  <div className="text-[11px] text-slate-700">
                    <p>
                      Status: {(item.payment_status || 'waiting').toUpperCase()}
                      {item.pay_amount ? ` • Pay ${item.pay_amount} ${(item.pay_currency || '').toUpperCase()}` : ''}
                    </p>
                    {item.payment_record_id ? <Link href={`/payments/${item.payment_record_id}`} className="mt-1 inline-flex font-semibold text-sky-700">Open payment status</Link> : null}
                  </div>
                ) : item.transaction_reference ? (
                  <p className="text-[11px] text-slate-700">TX: {item.transaction_reference}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
