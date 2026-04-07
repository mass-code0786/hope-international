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
    ? { wallet: data.wallet || {}, walletBinding: data.walletBinding || null, transactions: data.transactions, incomeTransactions: data.incomeTransactions || [] }
    : { wallet: data, walletBinding: data.walletBinding || null, transactions: data.transactions || [], incomeTransactions: data.incomeTransactions || [] };

  const incomeBalance = toNumber(normalized.wallet?.income_balance ?? normalized.wallet?.income_wallet_balance ?? normalized.wallet?.balance);
  const depositBalance = toNumber(normalized.wallet?.deposit_balance ?? normalized.wallet?.deposit_wallet_balance);
  const withdrawalBalance = toNumber(normalized.wallet?.withdrawal_balance ?? normalized.wallet?.withdrawal_wallet_balance);
  const auctionBonusBalance = toNumber(normalized.wallet?.auction_bonus_balance ?? normalized.wallet?.auction_bonus_wallet_balance);
  const btctBalance = toNumber(normalized.wallet?.btct_balance ?? normalized.wallet?.btct_wallet_balance);
  const btctLockedBalance = toNumber(normalized.wallet?.btct_locked_balance ?? normalized.wallet?.btct_locked_wallet_balance);
  const btctAvailableBalance = toNumber(normalized.wallet?.btct_available_balance ?? normalized.wallet?.btct_available_wallet_balance, btctBalance - btctLockedBalance);
  const auctionSpendableBalance = toNumber(normalized.wallet?.auction_spendable_balance ?? normalized.wallet?.auction_spendable_wallet_balance, incomeBalance + depositBalance + withdrawalBalance + auctionBonusBalance);

  return {
    ...normalized,
    wallet: {
      ...(normalized.wallet || {}),
      balance: toNumber(normalized.wallet?.balance, incomeBalance + depositBalance + withdrawalBalance),
      income_balance: incomeBalance,
      deposit_balance: depositBalance,
      withdrawal_balance: withdrawalBalance,
      auction_bonus_balance: auctionBonusBalance,
      auction_spendable_balance: auctionSpendableBalance,
      btct_balance: btctBalance,
      btct_locked_balance: btctLockedBalance,
      btct_available_balance: btctAvailableBalance,
      income_wallet_balance: incomeBalance,
      deposit_wallet_balance: depositBalance,
      withdrawal_wallet_balance: withdrawalBalance,
      auction_bonus_wallet_balance: auctionBonusBalance,
      auction_spendable_wallet_balance: auctionSpendableBalance,
      btct_wallet_balance: btctBalance,
      btct_locked_wallet_balance: btctLockedBalance,
      btct_available_wallet_balance: btctAvailableBalance
    },
    incomeTransactions: Array.isArray(normalized.incomeTransactions) ? normalized.incomeTransactions : [],
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

export async function getDepositWalletConfig() {
  const envelope = toEnvelope(await apiFetch('/wallet/deposit-config'));
  return {
    ...envelope,
    data: envelope.data || null
  };
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

export async function getBtctStakingSummary() {
  const envelope = toEnvelope(await apiFetch('/wallet/staking'));
  const data = envelope.data || {};
  return {
    ...envelope,
    data: {
      plan: data.plan || null,
      payouts: Array.isArray(data.payouts) ? data.payouts : [],
      eligibility: data.eligibility || {}
    }
  };
}

export async function startBtctStaking(payload = {}) {
  return toEnvelope(
    await apiFetch('/wallet/staking/start', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}
