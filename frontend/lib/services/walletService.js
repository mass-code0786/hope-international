import { apiFetch } from '@/lib/api/client';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBtctTransactions(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        amount: toNumber(item.amount)
      }))
    : [];
}

export async function getWallet() {
  const data = await apiFetch('/wallet');
  const normalized = data.wallet ? data : Array.isArray(data.transactions)
    ? { wallet: data.wallet || {}, walletBinding: data.walletBinding || null, transactions: data.transactions }
    : { wallet: data, walletBinding: data.walletBinding || null, transactions: data.transactions || [] };

  return {
    ...normalized,
    wallet: {
      ...(normalized.wallet || {}),
      balance: toNumber(normalized.wallet?.balance),
      btct_balance: toNumber(normalized.wallet?.btct_balance)
    },
    btctTransactions: normalizeBtctTransactions(normalized.btctTransactions || []),
    btctPrice: toNumber(normalized.btctPrice, 0.1)
  };
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
