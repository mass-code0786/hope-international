'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Copy, ImagePlus } from 'lucide-react';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminDepositWalletSettings, updateAdminDepositWalletSettings } from '@/lib/services/admin';
import { compressImageFile } from '@/lib/utils/imageUpload';
import { formatLabel } from '@/lib/utils/format';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

export default function AdminDepositWalletPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: queryKeys.adminDepositWalletSettings, queryFn: getAdminDepositWalletSettings });
  const [form, setForm] = useState({
    walletAddress: '',
    qrImageUrl: '',
    instructions: '',
    isActive: false
  });
  const [generatedQr, setGeneratedQr] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const data = settingsQuery.data?.data || {};
    setForm({
      walletAddress: data.walletAddress || '',
      qrImageUrl: data.qrImageUrl || '',
      instructions: data.instructions || 'Send only USDT on the BEP20 network. Deposits are credited after admin verification.',
      isActive: Boolean(data.isActive)
    });
  }, [settingsQuery.data]);

  useEffect(() => {
    let cancelled = false;
    if (!form.walletAddress || form.qrImageUrl) {
      setGeneratedQr('');
      return undefined;
    }

    QRCode.toDataURL(form.walletAddress, { width: 280, margin: 1 })
      .then((value) => {
        if (!cancelled) {
          setGeneratedQr(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeneratedQr('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.walletAddress, form.qrImageUrl]);

  const saveMutation = useMutation({
    mutationFn: () => updateAdminDepositWalletSettings(form),
    onSuccess: async (result) => {
      toast.success(result.message || 'Deposit wallet updated');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminDepositWalletSettings });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings });
      await queryClient.invalidateQueries({ queryKey: queryKeys.walletDepositConfig });
    },
    onError: (error) => toast.error(error.message || 'Unable to update deposit wallet')
  });

  if (settingsQuery.isLoading) return <AdminShellSkeleton />;
  if (settingsQuery.isError) return <ErrorState message="Unable to load deposit wallet settings." onRetry={settingsQuery.refetch} />;

  const qrPreview = form.qrImageUrl || generatedQr;

  return (
    <div className="space-y-5">
      <AdminSectionHeader title={formatLabel('Deposit Wallet')} subtitle="SuperAdmin controls the single active USDT BEP20 wallet shown to users." action={<Link href="/admin/settings" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Back to Settings</Link>} />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="card-surface p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-muted">
              Asset
              <input value="USDT" disabled className="mt-1 w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text/70" />
            </label>
            <label className="text-sm text-muted">
              Network
              <input value="BEP20" disabled className="mt-1 w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text/70" />
            </label>
          </div>

          <label className="mt-4 block text-sm text-muted">
            {formatLabel('Wallet Address')}
            <textarea value={form.walletAddress} onChange={(e) => setForm((prev) => ({ ...prev, walletAddress: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text" placeholder="Enter the active USDT BEP20 wallet address" />
          </label>

          <label className="mt-4 block text-sm text-muted">
            Instructions
            <textarea value={form.instructions} onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text" placeholder="Instructions shown to users on the deposit page" />
          </label>

          <div className="mt-4 rounded-2xl border border-white/10 bg-cardSoft p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">Optional QR Image Upload</p>
                <p className="mt-1 text-xs text-muted">If no QR image is uploaded, the app generates one dynamically from the wallet address.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-text">
                <ImagePlus size={16} />
                {isUploading ? 'Uploading...' : 'Upload QR'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!ACCEPTED_TYPES.includes(file.type)) {
                      toast.error('QR image must be PNG, JPG, or WEBP');
                      return;
                    }
                    if (file.size > MAX_FILE_SIZE_BYTES) {
                      toast.error('QR image must be 4MB or smaller');
                      return;
                    }
                    try {
                      setIsUploading(true);
                      const qrImageUrl = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, mimeType: file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg' });
                      setForm((prev) => ({ ...prev, qrImageUrl }));
                      toast.success('QR image uploaded');
                    } catch (error) {
                      toast.error(error.message || 'QR upload failed');
                    } finally {
                      setIsUploading(false);
                      event.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            {form.qrImageUrl ? (
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, qrImageUrl: '' }))} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted">
                Remove uploaded QR and use generated QR
              </button>
            ) : null}
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-cardSoft px-3 py-3 text-sm text-text">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
            {formatLabel('Deposit wallet')} active for users
          </label>

          <div className="mt-5 flex justify-end">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isUploading} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
              {saveMutation.isPending ? 'Saving...' : 'Save Deposit Wallet'}
            </button>
          </div>
        </section>

        <section className="card-surface p-5">
          <p className="text-sm font-semibold text-text">User Preview</p>
          <div className="mt-4 rounded-3xl border border-white/10 bg-cardSoft p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">USDT</span>
              <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300">BEP20</span>
            </div>
            <div className="mt-4 flex justify-center">
              {qrPreview ? <img src={qrPreview} alt="Deposit QR code preview" className="h-56 w-56 rounded-2xl border border-white/10 bg-white object-contain p-3" /> : <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted">QR preview appears here</div>}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <p className="text-[11px] tracking-[-0.01em] text-white/45">{formatLabel('Wallet Address')}</p>
              <p className="mt-2 break-all text-sm font-medium text-white">{form.walletAddress || 'No wallet address set'}</p>
              <button type="button" onClick={async () => {
                if (!form.walletAddress) return;
                await navigator.clipboard.writeText(form.walletAddress);
                toast.success('Wallet address copied');
              }} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/80">
                <Copy size={14} /> Copy Address
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">{form.instructions || 'Users will see deposit instructions here.'}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
