import { apiFetch } from '@/lib/api/client';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toEnvelope(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return {
      data: payload.data ?? null,
      pagination: payload.pagination ?? null,
      summary: payload.summary ?? null,
      message: payload.message ?? ''
    };
  }

  return {
    data: payload ?? null,
    pagination: null,
    summary: null,
    message: ''
  };
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
  const envelope = toEnvelope(await apiFetch('/wallet'));
  const data = envelope.data || {};
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
  return toEnvelope(
    await apiFetch('/wallet/deposits', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getDepositHistory() {
  const envelope = toEnvelope(await apiFetch('/wallet/deposits'));
  const items = envelope.data;
  return {
    ...envelope,
    data: Array.isArray(items) ? items : Array.isArray(items?.items) ? items.items : []
  };
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
