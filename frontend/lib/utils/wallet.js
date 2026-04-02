function toAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function getIncomeWalletBalance(walletData) {
  return toAmount(walletData?.wallet?.income_balance ?? walletData?.wallet?.income_wallet_balance ?? walletData?.income_balance);
}

export function getDepositWalletBalance(walletData) {
  return toAmount(walletData?.wallet?.deposit_balance ?? walletData?.wallet?.deposit_wallet_balance ?? walletData?.deposit_balance);
}

export function getBtctWalletBalance(walletData) {
  return toAmount(walletData?.wallet?.btct_balance ?? walletData?.wallet?.btct_wallet_balance ?? walletData?.btct_balance);
}

export function getAvailableWalletBalance(walletData) {
  const explicitTotal = walletData?.wallet?.balance ?? walletData?.balance;
  if (explicitTotal !== undefined && explicitTotal !== null) {
    return toAmount(explicitTotal);
  }
  return getIncomeWalletBalance(walletData) + getDepositWalletBalance(walletData);
}

export function hasSufficientWalletBalance(walletData, amount) {
  return getAvailableWalletBalance(walletData) >= toAmount(amount);
}
