import { apiFetch } from '@/lib/api/client';
import { demoWallet } from '@/lib/demo/mockData';
import { isDemoSessionActive } from '@/lib/utils/demoSession';

export async function getWallet() {
  if (isDemoSessionActive()) return demoWallet;
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
