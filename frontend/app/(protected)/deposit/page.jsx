'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Copy, Upload } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { createDepositRequest, getDepositHistory, getDepositWalletConfig } from '@/lib/services/walletService';
import { compressImageFile } from '@/lib/utils/imageUpload';
import { currency, dateTime, statusVariant } from '@/lib/utils/format';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function DepositPage() {
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const depositConfigQuery = useQuery({ queryKey: queryKeys.walletDepositConfig, queryFn: getDepositWalletConfig });
  const depositsQuery = useQuery({ queryKey: queryKeys.walletDeposits, queryFn: getDepositHistory });

  const depositMutation = useMutation({
    mutationFn: createDepositRequest,
    onSuccess: async (result) => {
      formRef.current?.reset();
      setProofImageUrl('');
      setProofFileName('');
      toast.success(result.message || 'USDT deposit submitted successfully');
      await queryClient.invalidateQueries({ queryKey: queryKeys.walletDeposits });
    },
    onError: (error) => toast.error(error.message || 'Deposit request failed')
  });

  const config = depositConfigQuery.data?.data || null;
  const depositsEnvelope = depositsQuery.data || {};
  const deposits = Array.isArray(depositsEnvelope.data) ? depositsEnvelope.data : [];

  useEffect(() => {
    let cancelled = false;
    if (!config?.walletAddress || config?.qrImageUrl) {
      setQrImage(config?.qrImageUrl || '');
      return undefined;
    }

    QRCode.toDataURL(config.walletAddress, { width: 280, margin: 1 })
      .then((value) => {
        if (!cancelled) setQrImage(value);
      })
      .catch(() => {
        if (!cancelled) setQrImage('');
      });

    return () => {
      cancelled = true;
    };
  }, [config?.walletAddress, config?.qrImageUrl]);

  if (depositConfigQuery.isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading deposit wallet...</div>;
  }

  if (depositConfigQuery.isError) {
    return <ErrorState message="Deposit wallet could not be loaded right now." onRetry={depositConfigQuery.refetch} />;
  }

  if (!config?.isActive || !config?.walletAddress) {
    return <ErrorState message="Crypto deposits are currently unavailable. Please contact support or try again later." onRetry={depositConfigQuery.refetch} />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="USDT Deposit"
        subtitle="Send USDT on BEP20 to the wallet below, then submit your transaction proof."
        action={<Link href="/history/deposit" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">History</Link>}
      />

      <section className="rounded-3xl border border-emerald-200 bg-[linear-gradient(135deg,#f8fffb_0%,#eefbf4_100%)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2">
          <Badge variant="success">{config.asset || 'USDT'}</Badge>
          <Badge variant="info">{config.network || 'BEP20'}</Badge>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex justify-center">
            {qrImage ? <img src={qrImage} alt="Deposit QR code" className="h-56 w-56 rounded-2xl border border-emerald-100 bg-white object-contain p-3 shadow-sm" /> : <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">QR unavailable</div>}
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Deposit Wallet Address</p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-950">{config.walletAddress}</p>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(config.walletAddress);
                  toast.success('Wallet address copied');
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <Copy size={14} /> Copy Address
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Instructions</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{config.instructions}</p>
            </div>
          </div>
        </div>
      </section>

      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          if (!proofImageUrl) {
            toast.error('Screenshot proof is required');
            return;
          }
          depositMutation.mutate({
            amount: Number(formData.get('amount') || 0),
            txHash: String(formData.get('txHash') || ''),
            proofImageUrl,
            note: String(formData.get('note') || '')
          });
        }}
        className="space-y-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
      >
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Asset</p>
            <p className="mt-1 font-semibold text-slate-950">{config.asset || 'USDT'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Network</p>
            <p className="mt-1 font-semibold text-slate-950">{config.network || 'BEP20'}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deposit-amount" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Amount (USDT)</label>
          <input id="deposit-amount" name="amount" type="number" min="1" step="0.01" placeholder="Enter USDT amount sent" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deposit-tx-hash" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Transaction Hash</label>
          <input id="deposit-tx-hash" name="txHash" placeholder="Paste the blockchain transaction hash" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
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

        <p className="text-xs font-medium leading-5 text-slate-700">Your request is saved as pending immediately and will be credited only after admin verification.</p>
        <button disabled={depositMutation.isPending || isUploadingProof} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {depositMutation.isPending ? 'Submitting deposit...' : 'Submit Deposit Proof'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600">Latest Deposit Requests</div>
        {depositsQuery.isError ? (
          <div className="p-3"><ErrorState message="Deposit history could not be loaded." onRetry={depositsQuery.refetch} /></div>
        ) : !deposits.length ? (
          <div className="p-3"><EmptyState title="No deposits yet" description="Your submitted crypto deposits will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deposits.slice(0, 10).map((item) => (
              <div key={item.id} className="space-y-1 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
                <p className="text-[11px] font-medium text-slate-600">{item.asset || 'USDT'} • {item.network || 'BEP20'} • {dateTime(item.created_at)}</p>
                {item.transaction_reference ? <p className="text-[11px] text-slate-700">TX: {item.transaction_reference}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

