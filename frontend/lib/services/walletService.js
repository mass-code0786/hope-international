import { apiFetch } from '@/lib/api/client';

export async function getWallet() {
  const data = await apiFetch('/wallet');
  if (data.wallet) return data;
  if (Array.isArray(data.transactions)) {
    return { wallet: data.wallet || {}, transactions: data.transactions };
  }
  return { wallet: data, transactions: data.transactions || [] };
}

export async function getWalletTransactions() {
  const data = await getWallet();
  return data.transactions || [];
}
