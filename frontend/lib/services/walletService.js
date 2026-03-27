import { apiFetch } from '@/lib/api/client';

export async function getWallet() {
  const data = await apiFetch('/wallet');
  if (data.wallet) return data;
  if (Array.isArray(data.transactions)) {
    return { wallet: data.wallet || {}, walletBinding: data.walletBinding || null, transactions: data.transactions };
  }
  return { wallet: data, walletBinding: data.walletBinding || null, transactions: data.transactions || [] };
}

export async function getWalletTransactions() {
  const data = await getWallet();
  return data.transactions || [];
}

export async function bindWalletAddress(payload) {
  return apiFetch('/wallet/bind', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function createDepositRequest(payload) {
  return apiFetch('/wallet/deposits', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getDepositHistory() {
  const data = await apiFetch('/wallet/deposits');
  return Array.isArray(data) ? data : data.items || [];
}

export async function createWithdrawalRequest(payload) {
  return apiFetch('/wallet/withdrawals', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getWithdrawalHistory() {
  const data = await apiFetch('/wallet/withdrawals');
  return Array.isArray(data) ? data : data.items || [];
}

export async function createP2pTransfer(payload) {
  return apiFetch('/wallet/p2p', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getP2pHistory() {
  const data = await apiFetch('/wallet/p2p');
  return Array.isArray(data) ? data : data.items || [];
}

export async function getWalletHubHistory(type = 'all') {
  const suffix = type && type !== 'all' ? `?type=${encodeURIComponent(type)}` : '';
  return apiFetch(`/wallet/history${suffix}`);
}
