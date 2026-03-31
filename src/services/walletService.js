const walletRepository = require('../repositories/walletRepository');
const userRepository = require('../repositories/userRepository');
const adminRepository = require('../repositories/adminRepository');
const { ApiError } = require('../utils/ApiError');

const MIN_WITHDRAWAL_AMOUNT = 10;
const MIN_DEPOSIT_AMOUNT = 1;
const BTCT_USD_PRICE = 0.10;
const DEPOSIT_ASSET = 'USDT';
const DEPOSIT_NETWORK = 'BEP20';
const DEPOSIT_WALLET_SETTING_KEY = 'deposit_wallet_config';

function roundBtct(value) {
  return Number(Number(value || 0).toFixed(4));
}

function normalizeDepositWalletConfig(value = {}, meta = {}) {
  const config = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    asset: DEPOSIT_ASSET,
    network: DEPOSIT_NETWORK,
    walletAddress: String(config.walletAddress || '').trim(),
    qrImageUrl: String(config.qrImageUrl || '').trim(),
    isActive: Boolean(config.isActive),
    instructions: String(config.instructions || 'Send only USDT on the BEP20 network. Deposits are credited after admin verification.').trim(),
    updatedAt: meta.updatedAt || null,
    updatedBy: meta.updatedBy || null
  };
}

function isSupportedProofImage(value) {
  const normalized = String(value || '').trim();
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(normalized) || /^https:\/\//i.test(normalized);
}

async function getDepositWalletConfig(client, options = {}) {
  const rows = await adminRepository.getSettings(client);
  const row = rows.find((item) => item.setting_key === DEPOSIT_WALLET_SETTING_KEY);
  const config = normalizeDepositWalletConfig(row?.setting_value, {
    updatedAt: row?.updated_at || null,
    updatedBy: row?.updated_by || null
  });

  if (options.requireActive && (!config.isActive || !config.walletAddress)) {
    throw new ApiError(503, 'Deposit wallet is currently unavailable');
  }

  return config;
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

  const txHash = String(payload.txHash || payload.transactionHash || '').trim();
  if (txHash.length < 6) {
    throw new ApiError(400, 'Transaction hash is required');
  }

  const proofImageUrl = String(payload.proofImageUrl || '').trim();
  if (!isSupportedProofImage(proofImageUrl)) {
    throw new ApiError(400, 'Screenshot proof must be a PNG, JPG, or WEBP image');
  }

  const note = String(payload.note || '').trim();
  const depositWallet = await getDepositWalletConfig(client, { requireActive: true });
  const details = {
    asset: DEPOSIT_ASSET,
    network: DEPOSIT_NETWORK,
    walletAddressSnapshot: depositWallet.walletAddress,
    transactionReference: txHash,
    txHash,
    proofImageUrl
  };

  if (note) {
    details.note = note;
  }

  return walletRepository.createDepositRequest(client, {
    userId,
    asset: DEPOSIT_ASSET,
    network: DEPOSIT_NETWORK,
    walletAddressSnapshot: depositWallet.walletAddress,
    amount,
    transactionHash: txHash,
    proofImageUrl,
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
  getDepositWalletConfig,
  createDepositRequest,
  createWithdrawalRequest,
  createP2pTransfer,
  getHubHistory
};
