const walletRepository = require('../repositories/walletRepository');
const { ApiError } = require('../utils/ApiError');

async function credit(client, userId, amount, source, referenceId = null, metadata = {}, createdByAdminId = null) {
  if (Number(amount) <= 0) {
    throw new ApiError(400, 'Credit amount must be positive');
  }

  await walletRepository.createWallet(client, userId);
  const wallet = await walletRepository.adjustBalance(client, userId, amount);

  await walletRepository.createTransaction(client, {
    userId,
    txType: 'credit',
    source,
    amount,
    referenceId,
    metadata,
    createdByAdminId
  });

  return wallet;
}

async function debit(client, userId, amount, source, referenceId = null, metadata = {}, createdByAdminId = null) {
  if (Number(amount) <= 0) {
    throw new ApiError(400, 'Debit amount must be positive');
  }

  await walletRepository.createWallet(client, userId);
  const wallet = await walletRepository.getWallet(client, userId);

  if (!wallet || Number(wallet.balance) < Number(amount)) {
    throw new ApiError(400, 'Insufficient wallet balance');
  }

  const updatedWallet = await walletRepository.adjustBalance(client, userId, -Number(amount));
  await walletRepository.createTransaction(client, {
    userId,
    txType: 'debit',
    source,
    amount,
    referenceId,
    metadata,
    createdByAdminId
  });

  return updatedWallet;
}

async function getWalletSummary(client, userId) {
  await walletRepository.createWallet(client, userId);
  const wallet = await walletRepository.getWallet(client, userId);
  const transactions = await walletRepository.listTransactions(client, userId, 100);
  return {
    wallet,
    transactions
  };
}

module.exports = {
  credit,
  debit,
  getWalletSummary
};
