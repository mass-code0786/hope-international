function toAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function getAvailableWalletBalance(walletData) {
  return toAmount(walletData?.wallet?.balance ?? walletData?.balance);
}

export function hasSufficientWalletBalance(walletData, amount) {
  return getAvailableWalletBalance(walletData) >= toAmount(amount);
}
