const walletRepository = require('../repositories/walletRepository');
const userRepository = require('../repositories/userRepository');
const { ApiError } = require('../utils/ApiError');

const MIN_WITHDRAWAL_AMOUNT = 10;
const MIN_DEPOSIT_AMOUNT = 1;
const BTCT_USD_PRICE = 0.10;

function roundBtct(value) {
  return Number(Number(value || 0).toFixed(4));
}

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
  const updatedWallet = await walletRepository.debitBalanceIfSufficient(client, userId, Number(amount));

  if (!updatedWallet) {
    throw new ApiError(400, 'Insufficient wallet balance');
  }
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

async function creditBtct(client, userId, amount, source, referenceId = null, metadata = {}, createdByAdminId = null) {
  const safeAmount = roundBtct(amount);
  if (safeAmount <= 0) {
    throw new ApiError(400, 'BTCT credit amount must be positive');
  }

  await walletRepository.createWallet(client, userId);
  const wallet = await walletRepository.adjustBtctBalance(client, userId, safeAmount);

  const transaction = await walletRepository.createBtctTransaction(client, {
    userId,
    txType: 'credit',
    source,
    amount: safeAmount,
    referenceId,
    metadata,
    createdByAdminId
  });

  return {
    wallet,
    transaction,
    btctPrice: BTCT_USD_PRICE
  };
}

async function getWalletSummary(client, userId) {
  await walletRepository.createWallet(client, userId);
  const wallet = await walletRepository.getWallet(client, userId);
  const transactions = await walletRepository.listTransactions(client, userId, 100);
  const btctTransactions = await walletRepository.listBtctTransactions(client, userId, 100);
  const walletBinding = await walletRepository.getWalletBinding(client, userId);

  return {
    wallet,
    walletBinding,
    transactions,
    btctTransactions,
    btctPrice: BTCT_USD_PRICE
  };
}

async function bindWalletAddress(client, userId, payload) {
  const walletAddress = String(payload.walletAddress || '').trim();
  const network = String(payload.network || '').trim();

  if (walletAddress.length < 8) {
    throw new ApiError(400, 'Wallet address looks invalid');
  }

  return walletRepository.upsertWalletBinding(client, userId, {
    walletAddress,
    network: network || null
  });
}

async function createDepositRequest(client, userId, payload) {
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_AMOUNT) {
    throw new ApiError(400, `Minimum deposit is ${MIN_DEPOSIT_AMOUNT}`);
  }

  const rawDetails = payload && typeof payload.details === 'object' && !Array.isArray(payload.details) ? payload.details : {};
  const txHash = String(
    payload.txHash
    || payload.transactionReference
    || rawDetails.transactionReference
    || rawDetails.txHash
    || ''
  ).trim();
  if (txHash.length < 6) {
    throw new ApiError(400, 'Transaction hash is required');
  }

  const senderWalletAddress = String(
    payload.senderWalletAddress
    || rawDetails.senderWalletAddress
    || rawDetails.walletAddress
    || ''
  ).trim();
  if (senderWalletAddress && senderWalletAddress.length < 8) {
    throw new ApiError(400, 'Sender wallet address looks invalid');
  }

  const note = String(payload.note ?? payload.instructions ?? rawDetails.note ?? '').trim();
  const details = {
    asset: 'USDT',
    network: 'BEP20',
    transactionReference: txHash,
    txHash
  };

  if (senderWalletAddress) {
    details.senderWalletAddress = senderWalletAddress;
  }
  if (note) {
    details.note = note;
  }

  return walletRepository.createDepositRequest(client, {
    userId,
    amount,
    method: 'crypto',
    instructions: note || null,
    details,
    status: 'pending'
  });
}

async function createWithdrawalRequest(client, userId, payload) {
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new ApiError(400, `Minimum withdrawal is ${MIN_WITHDRAWAL_AMOUNT}`);
  }

  await walletRepository.createWallet(client, userId);
  const wallet = await walletRepository.getWallet(client, userId);
  if (!wallet || Number(wallet.balance) < amount) {
    throw new ApiError(400, 'Insufficient wallet balance');
  }

  const binding = await walletRepository.getWalletBinding(client, userId);
  const walletAddress = String(payload.walletAddress || binding?.wallet_address || '').trim();
  if (!walletAddress || walletAddress.length < 8) {
    throw new ApiError(400, 'Valid wallet address is required');
  }

  const network = String(payload.network || binding?.network || '').trim();
  const notes = String(payload.notes || '').trim();

  const request = await walletRepository.createWithdrawalRequest(client, {
    userId,
    amount,
    walletAddress,
    network: network || null,
    notes: notes || null,
    status: 'pending'
  });

  await debit(client, userId, amount, 'withdrawal_request', request.id, {
    withdrawalRequestId: request.id,
    status: 'pending'
  });

  return request;
}

async function createP2pTransfer(client, senderUserId, payload) {
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Transfer amount must be positive');
  }

  const targetIdentifier = String(payload.toUsername || payload.toUserId || '').trim();
  if (!targetIdentifier) {
    throw new ApiError(400, 'Recipient username is required');
  }

  const targetUser = await userRepository.findByUsername(client, targetIdentifier);
  if (!targetUser) {
    throw new ApiError(404, 'Recipient not found');
  }

  if (String(targetUser.id) === String(senderUserId)) {
    throw new ApiError(400, 'Cannot transfer to your own account');
  }

  const notes = String(payload.notes || '').trim();

  const transfer = await walletRepository.createP2pTransfer(client, {
    fromUserId: senderUserId,
    toUserId: targetUser.id,
    amount,
    notes: notes || null,
    status: 'completed'
  });

  await debit(client, senderUserId, amount, 'p2p_transfer', transfer.id, {
    direction: 'out',
    counterpartyUserId: targetUser.id,
    counterpartyUsername: targetUser.username
  });

  await credit(client, targetUser.id, amount, 'p2p_transfer', transfer.id, {
    direction: 'in',
    counterpartyUserId: senderUserId
  });

  return {
    ...transfer,
    to_username: targetUser.username
  };
}

async function getHubHistory(client, userId) {
  const [deposits, withdrawals, p2pTransfers, orders, btctTransactions] = await Promise.all([
    walletRepository.listDepositRequests(client, userId, 200),
    walletRepository.listWithdrawalRequests(client, userId, 200),
    walletRepository.listP2pTransfers(client, userId, 200),
    walletRepository.listTransactions(client, userId, 200),
    walletRepository.listBtctTransactions(client, userId, 200)
  ]);

  return {
    deposits,
    withdrawals,
    p2pTransfers,
    transactions: orders,
    btctTransactions,
    btctPrice: BTCT_USD_PRICE
  };
}

module.exports = {
  MIN_DEPOSIT_AMOUNT,
  MIN_WITHDRAWAL_AMOUNT,
  credit,
  debit,
  creditBtct,
  getWalletSummary,
  bindWalletAddress,
  createDepositRequest,
  createWithdrawalRequest,
  createP2pTransfer,
  getHubHistory
};



