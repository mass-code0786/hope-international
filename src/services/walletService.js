const walletRepository = require('../repositories/walletRepository');
const userRepository = require('../repositories/userRepository');
const adminRepository = require('../repositories/adminRepository');
const notificationService = require('./notificationService');
const { ApiError } = require('../utils/ApiError');
const { withPerfSpan } = require('../utils/perf');

const MIN_WITHDRAWAL_AMOUNT = 10;
const MIN_DEPOSIT_AMOUNT = 1;
const MIN_WALLET_TRANSFER_AMOUNT = 5;
const WALLET_TRANSFER_DUPLICATE_WINDOW_SECONDS = 30;
const WALLET_TRANSFER_BURST_WINDOW_SECONDS = 300;
const WALLET_TRANSFER_BURST_LIMIT = 5;
const WITHDRAWAL_DUPLICATE_WINDOW_SECONDS = 300;
const WITHDRAWAL_BURST_WINDOW_SECONDS = 900;
const WITHDRAWAL_BURST_LIMIT = 3;
const WELCOME_SPIN_ATTEMPT_WINDOW_SECONDS = 300;
const WELCOME_SPIN_ATTEMPT_LIMIT = 5;
const BTCT_USD_PRICE = 0.10;
const DEPOSIT_ASSET = 'USDT';
const DEPOSIT_NETWORK = 'BEP20';
const DEPOSIT_WALLET_SETTING_KEY = 'deposit_wallet_config';
const WELCOME_SPIN_REWARD_POOL = [
  { amount: 0.10, weight: 30 },
  { amount: 0.20, weight: 24 },
  { amount: 0.30, weight: 18 },
  { amount: 0.50, weight: 14 },
  { amount: 0.75, weight: 9 },
  { amount: 1.00, weight: 5 }
];
const WALLET_TRANSFER_RULES = new Map([
  ['income_wallet:deposit_wallet', true]
]);

function normalizeWalletTransferType(value) {
  return String(value || '').trim().toLowerCase();
}

function isAllowedWalletTransfer(fromWallet, toWallet) {
  return WALLET_TRANSFER_RULES.has(`${fromWallet}:${toWallet}`);
}

function buildTransferReference() {
  return `WTX_${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function isWalletFrozen(wallet = {}, walletType) {
  return Boolean({
    deposit_wallet: wallet.deposit_wallet_frozen,
    income_wallet: wallet.income_wallet_frozen,
    bonus_wallet: wallet.bonus_wallet_frozen
  }[walletType]);
}

function roundBtct(value) {
  return Number(Number(value || 0).toFixed(4));
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function sanitizeRequestMeta(meta = {}) {
  return {
    ipAddress: String(meta.ipAddress || '').trim() || null
  };
}

async function logSecurityEvent(client, payload = {}) {
  try {
    await walletRepository.createSecurityEvent(client, {
      userId: payload.userId || null,
      actionType: payload.actionType,
      reason: payload.reason,
      metadata: payload.metadata || {},
      ipAddress: payload.ipAddress || null
    });
  } catch (_error) {
    // Security logging must not break the main flow.
  }
}

async function blockWithSecurityLog(client, payload, statusCode, message) {
  await logSecurityEvent(client, payload);
  throw new ApiError(statusCode, message);
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

function normalizeWalletBalances(wallet = {}) {
  const incomeBalance = toMoney(wallet?.income_balance ?? wallet?.income_wallet_balance ?? wallet?.balance ?? 0);
  const depositBalance = toMoney(wallet?.deposit_balance ?? wallet?.deposit_wallet_balance ?? 0);
  const bonusBalance = toMoney(wallet?.bonus_balance ?? wallet?.bonus_wallet_balance ?? wallet?.auction_bonus_balance ?? wallet?.auction_bonus_wallet_balance ?? 0);
  const btctBalance = roundBtct(wallet?.btct_balance ?? wallet?.btct_wallet_balance ?? 0);
  const btctLockedBalance = roundBtct(wallet?.btct_locked_balance ?? wallet?.btct_locked_wallet_balance ?? 0);
  const btctAvailableBalance = roundBtct(btctBalance - btctLockedBalance);
  const totalBalance = toMoney(wallet?.balance ?? incomeBalance + depositBalance);
  const auctionSpendableBalance = toMoney(totalBalance + bonusBalance);

  return {
    ...(wallet || {}),
    balance: totalBalance,
    income_balance: incomeBalance,
    deposit_balance: depositBalance,
    bonus_balance: bonusBalance,
    auction_bonus_balance: bonusBalance,
    auction_spendable_balance: auctionSpendableBalance,
    btct_balance: btctBalance,
    btct_locked_balance: btctLockedBalance,
    btct_available_balance: btctAvailableBalance,
    income_wallet_balance: incomeBalance,
    deposit_wallet_balance: depositBalance,
    bonus_wallet_balance: bonusBalance,
    auction_bonus_wallet_balance: bonusBalance,
    deposit_wallet_frozen: Boolean(wallet?.deposit_wallet_frozen),
    income_wallet_frozen: Boolean(wallet?.income_wallet_frozen),
    bonus_wallet_frozen: Boolean(wallet?.bonus_wallet_frozen),
    auction_spendable_wallet_balance: auctionSpendableBalance,
    btct_wallet_balance: btctBalance,
    btct_locked_wallet_balance: btctLockedBalance,
    btct_available_wallet_balance: btctAvailableBalance
  };
}

function resolveCashWalletType(source, metadata = {}) {
  const requestedWalletType = String(metadata?.walletType || '').trim().toLowerCase();
  if (['deposit', 'income', 'bonus', 'auction_bonus', 'deposit_wallet', 'income_wallet', 'bonus_wallet'].includes(requestedWalletType)) {
    return requestedWalletType.replace('_wallet', '');
  }

  if (source === 'deposit_request') return 'deposit';
  if (source === 'btct_staking_payout') return 'income';
  if (['direct_income', 'matching_income', 'reward_qualification', 'direct_deposit_income', 'level_deposit_income'].includes(source)) return 'income';
  if (source === 'p2p_transfer' && metadata?.direction === 'in') return 'deposit';
  return 'income';
}

function isSupportedProofImage(value) {
  const normalized = String(value || '').trim();
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(normalized) || /^https:\/\//i.test(normalized);
}

function pickWelcomeSpinReward() {
  const totalWeight = WELCOME_SPIN_REWARD_POOL.reduce((sum, entry) => sum + Number(entry.weight || 0), 0);
  let cursor = Math.random() * totalWeight;
  for (const entry of WELCOME_SPIN_REWARD_POOL) {
    cursor -= Number(entry.weight || 0);
    if (cursor <= 0) return toMoney(entry.amount);
  }
  return toMoney(WELCOME_SPIN_REWARD_POOL[WELCOME_SPIN_REWARD_POOL.length - 1]?.amount || 0.1);
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
  const walletType = resolveCashWalletType(source, metadata);
  const wallet = walletType === 'deposit'
    ? await walletRepository.adjustDepositBalance(client, userId, amount)
    : walletType === 'bonus' || walletType === 'auction_bonus'
        ? await walletRepository.adjustAuctionBonusBalance(client, userId, amount)
      : await walletRepository.adjustIncomeBalance(client, userId, amount);

  const transaction = await walletRepository.createTransaction(client, {
    userId,
    txType: 'credit',
    source,
    amount,
    referenceId,
    metadata: {
      ...metadata,
      walletType
    },
    createdByAdminId
  });

  const notificationPayload = notificationService.buildWalletTransactionNotification(transaction);
  if (notificationPayload) {
    await notificationService.createNotificationOnce(client, notificationPayload);
  }

  return normalizeWalletBalances(wallet);
}

async function creditWithTransaction(client, userId, amount, source, referenceId = null, metadata = {}, createdByAdminId = null) {
  if (Number(amount) <= 0) {
    throw new ApiError(400, 'Credit amount must be positive');
  }

  await walletRepository.createWallet(client, userId);
  const walletType = resolveCashWalletType(source, metadata);
  const wallet = walletType === 'deposit'
    ? await walletRepository.adjustDepositBalance(client, userId, amount)
    : walletType === 'bonus' || walletType === 'auction_bonus'
        ? await walletRepository.adjustAuctionBonusBalance(client, userId, amount)
      : await walletRepository.adjustIncomeBalance(client, userId, amount);

  const transaction = await walletRepository.createTransaction(client, {
    userId,
    txType: 'credit',
    source,
    amount,
    referenceId,
    metadata: {
      ...metadata,
      walletType
    },
    createdByAdminId
  });

  const notificationPayload = notificationService.buildWalletTransactionNotification(transaction);
  if (notificationPayload) {
    await notificationService.createNotificationOnce(client, notificationPayload);
  }

  return {
    wallet: normalizeWalletBalances(wallet),
    transaction
  };
}

async function debit(client, userId, amount, source, referenceId = null, metadata = {}, createdByAdminId = null) {
  if (Number(amount) <= 0) {
    throw new ApiError(400, 'Debit amount must be positive');
  }

  await walletRepository.createWallet(client, userId);
  const updatedWallet = await walletRepository.debitCombinedBalanceIfSufficient(client, userId, Number(amount));

  if (!updatedWallet) {
    await logSecurityEvent(client, {
      userId,
      actionType: 'wallet_debit_blocked',
      reason: 'insufficient_balance',
      metadata: { source, amount: toMoney(amount), referenceId, walletType: metadata?.walletType || 'spendable' }
    });
    throw new ApiError(400, 'Insufficient wallet balance');
  }

  const debitBreakdown = {
    income: toMoney(updatedWallet.debited_income_balance || 0),
    deposit: toMoney(updatedWallet.debited_deposit_balance || 0)
  };

  await walletRepository.createTransaction(client, {
    userId,
    txType: 'debit',
    source,
    amount,
    referenceId,
    metadata: {
      ...metadata,
      walletType: 'spendable',
      walletBreakdown: debitBreakdown
    },
    createdByAdminId
  });

  return {
    ...normalizeWalletBalances(updatedWallet),
    debitBreakdown
  };
}

async function debitForAuctionEntry(client, userId, amount, source, referenceId = null, metadata = {}, createdByAdminId = null) {
  if (Number(amount) <= 0) {
    throw new ApiError(400, 'Debit amount must be positive');
  }

  await walletRepository.createWallet(client, userId);
  const updatedWallet = await walletRepository.debitAuctionBalanceIfSufficient(client, userId, Number(amount));

  if (!updatedWallet) {
    await logSecurityEvent(client, {
      userId,
      actionType: 'auction_entry_blocked',
      reason: 'insufficient_balance',
      metadata: { source, amount: toMoney(amount), referenceId, auctionId: metadata?.auctionId || null }
    });
    throw new ApiError(400, 'Insufficient wallet balance');
  }

  const debitBreakdown = {
    bonus: toMoney(updatedWallet.debited_auction_bonus_balance || 0),
    income: toMoney(updatedWallet.debited_income_balance || 0),
    deposit: toMoney(updatedWallet.debited_deposit_balance || 0)
  };

  await walletRepository.createTransaction(client, {
    userId,
    txType: 'debit',
    source,
    amount,
    referenceId,
    metadata: {
      ...metadata,
      walletType: 'auction_entry',
      walletBreakdown: debitBreakdown
    },
    createdByAdminId
  });

  return {
    ...normalizeWalletBalances(updatedWallet),
    debitBreakdown
  };
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

  const notificationPayload = notificationService.buildBtctTransactionNotification(transaction);
  if (notificationPayload) {
    await notificationService.createNotificationOnce(client, notificationPayload);
  }

  return {
    wallet: normalizeWalletBalances(wallet),
    transaction,
    btctPrice: BTCT_USD_PRICE
  };
}

async function getWalletSummary(client, userId, options = {}) {
  return withPerfSpan(`wallet.summary:${userId}`, async () => {
    await walletRepository.createWallet(client, userId);
    const includeHistory = options.includeHistory === true;
    const [walletRow, walletBinding, transactions, incomeTransactions, btctTransactions] = await Promise.all([
      withPerfSpan(`wallet.summary.db.wallet:${userId}`, () => walletRepository.getWallet(client, userId), { thresholdMs: 80 }),
      withPerfSpan(`wallet.summary.db.binding:${userId}`, () => walletRepository.getWalletBinding(client, userId), { thresholdMs: 80 }),
      includeHistory
        ? withPerfSpan(`wallet.summary.db.transactions:${userId}`, () => walletRepository.listTransactions(client, userId, 50), { thresholdMs: 100 })
        : Promise.resolve([]),
      includeHistory
        ? withPerfSpan(`wallet.summary.db.income:${userId}`, () => walletRepository.listIncomeTransactions(client, userId, 120), { thresholdMs: 100 })
        : Promise.resolve([]),
      includeHistory
        ? withPerfSpan(`wallet.summary.db.btct:${userId}`, () => walletRepository.listBtctTransactions(client, userId, 80), { thresholdMs: 100 })
        : Promise.resolve([])
    ]);
    const wallet = normalizeWalletBalances(walletRow);

    return {
      wallet,
      walletBinding,
      transactions,
      incomeTransactions,
      btctTransactions,
      btctPrice: BTCT_USD_PRICE
    };
  }, { thresholdMs: 120, meta: { includeHistory: Boolean(options.includeHistory) } });
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
  const requestMeta = sanitizeRequestMeta(payload.requestMeta);
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new ApiError(400, `Minimum withdrawal is ${MIN_WITHDRAWAL_AMOUNT}`);
  }

  await walletRepository.createWallet(client, userId);
  const wallet = normalizeWalletBalances(await walletRepository.getWalletForUpdate(client, userId));
  if (isWalletFrozen(wallet, 'income_wallet')) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'withdrawal_blocked',
      reason: 'wallet_frozen',
      ipAddress: requestMeta.ipAddress,
      metadata: { walletType: 'income_wallet', amount: toMoney(amount) }
    }, 403, 'Income wallet is frozen');
  }
  const withdrawableBalance = toMoney(wallet?.income_balance ?? wallet?.income_wallet_balance ?? 0);
  if (!wallet || withdrawableBalance < amount) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'withdrawal_blocked',
      reason: 'insufficient_balance',
      ipAddress: requestMeta.ipAddress,
      metadata: { amount: toMoney(amount), incomeBalance: withdrawableBalance }
    }, 400, 'Insufficient balance.');
  }

  const binding = await walletRepository.getWalletBinding(client, userId);
  const walletAddress = String(payload.walletAddress || binding?.wallet_address || '').trim();
  if (!walletAddress || walletAddress.length < 8) {
    throw new ApiError(400, 'Valid wallet address is required');
  }

  const network = String(payload.network || binding?.network || '').trim();
  const notes = String(payload.notes || '').trim();

  const recentWithdrawalCount = await walletRepository.countRecentWithdrawalRequests(client, userId, WITHDRAWAL_BURST_WINDOW_SECONDS);
  if (recentWithdrawalCount >= WITHDRAWAL_BURST_LIMIT) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'withdrawal_blocked',
      reason: 'rate_limited',
      ipAddress: requestMeta.ipAddress,
      metadata: { recentWithdrawalCount, windowSeconds: WITHDRAWAL_BURST_WINDOW_SECONDS }
    }, 429, 'Too many attempts. Please try again later.');
  }

  const duplicateRequest = await walletRepository.findRecentWithdrawalDuplicate(client, {
    userId,
    amount: toMoney(amount),
    walletAddress,
    withinSeconds: WITHDRAWAL_DUPLICATE_WINDOW_SECONDS
  });
  if (duplicateRequest) {
    await logSecurityEvent(client, {
      userId,
      actionType: 'withdrawal_duplicate',
      reason: 'already_processed',
      ipAddress: requestMeta.ipAddress,
      metadata: { duplicateRequestId: duplicateRequest.id, amount: toMoney(amount), walletAddress }
    });
    throw new ApiError(409, 'This action was already processed.');
  }

  const request = await walletRepository.createWithdrawalRequest(client, {
    userId,
    amount,
    walletAddress,
    network: network || null,
    notes: notes || null,
    status: 'pending'
  });

  const updatedWallet = await walletRepository.debitIncomeBalanceIfSufficient(client, userId, amount);
  if (!updatedWallet) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'withdrawal_blocked',
      reason: 'insufficient_balance_race',
      ipAddress: requestMeta.ipAddress,
      metadata: { amount: toMoney(amount) }
    }, 400, 'Insufficient balance.');
  }

  await walletRepository.createTransaction(client, {
    userId,
    txType: 'debit',
    source: 'withdrawal_request',
    amount,
    referenceId: request.id,
    metadata: {
      withdrawalRequestId: request.id,
      status: 'pending',
      walletType: 'income',
      walletBreakdown: {
        income: toMoney(updatedWallet.debited_income_balance || 0)
      }
    }
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
    counterpartyUserId: senderUserId,
    counterpartyUsername: targetUser.username
  });

  return {
    ...transfer,
    to_username: targetUser.username
  };
}

async function createWalletTransfer(client, userId, payload) {
  const fromWallet = normalizeWalletTransferType(payload.fromWallet);
  const toWallet = normalizeWalletTransferType(payload.toWallet);
  const amount = toMoney(payload.amount);
  const requestMeta = sanitizeRequestMeta(payload.requestMeta);

  if (!fromWallet || !toWallet) {
    throw new ApiError(400, 'Source and destination wallets are required');
  }

  if (fromWallet === toWallet) {
    throw new ApiError(400, 'Cannot transfer to the same wallet');
  }

  if (!['deposit_wallet', 'income_wallet', 'bonus_wallet'].includes(fromWallet)
    || !['deposit_wallet', 'income_wallet', 'bonus_wallet'].includes(toWallet)) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'wallet_transfer_blocked',
      reason: 'invalid_wallet',
      ipAddress: requestMeta.ipAddress,
      metadata: { fromWallet, toWallet }
    }, 400, 'Invalid wallet selection');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Transfer amount must be positive');
  }

  if (amount < MIN_WALLET_TRANSFER_AMOUNT) {
    throw new ApiError(400, `Minimum transfer amount is ${MIN_WALLET_TRANSFER_AMOUNT}`);
  }

  if (!isAllowedWalletTransfer(fromWallet, toWallet)) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'wallet_transfer_blocked',
      reason: 'invalid_transfer_path',
      ipAddress: requestMeta.ipAddress,
      metadata: { fromWallet, toWallet, amount }
    }, 403, 'This wallet transfer is not allowed.');
  }

  await walletRepository.createWallet(client, userId);
  const wallet = normalizeWalletBalances(await walletRepository.getWalletForUpdate(client, userId));
  if (isWalletFrozen(wallet, fromWallet)) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'wallet_transfer_blocked',
      reason: 'wallet_frozen',
      ipAddress: requestMeta.ipAddress,
      metadata: { fromWallet, toWallet, amount }
    }, 403, 'Source wallet is frozen.');
  }

  const recentTransferCount = await walletRepository.countRecentWalletTransfers(client, userId, WALLET_TRANSFER_BURST_WINDOW_SECONDS);
  if (recentTransferCount >= WALLET_TRANSFER_BURST_LIMIT) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'wallet_transfer_blocked',
      reason: 'rate_limited',
      ipAddress: requestMeta.ipAddress,
      metadata: { recentTransferCount, windowSeconds: WALLET_TRANSFER_BURST_WINDOW_SECONDS }
    }, 429, 'Too many attempts. Please try again later.');
  }

  const duplicateTransfer = await walletRepository.findRecentWalletTransferDuplicate(client, {
    userId,
    fromWallet,
    toWallet,
    amount,
    withinSeconds: WALLET_TRANSFER_DUPLICATE_WINDOW_SECONDS
  });
  if (duplicateTransfer) {
    await logSecurityEvent(client, {
      userId,
      actionType: 'wallet_transfer_duplicate',
      reason: 'already_processed',
      ipAddress: requestMeta.ipAddress,
      metadata: { duplicateTransactionId: duplicateTransfer.id, fromWallet, toWallet, amount }
    });
    throw new ApiError(409, 'This action was already processed.');
  }

  const referenceCode = buildTransferReference();
  const updatedWallet = await walletRepository.transferBetweenWallets(client, userId, fromWallet, toWallet, amount);

  if (!updatedWallet) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'wallet_transfer_blocked',
      reason: 'insufficient_balance',
      ipAddress: requestMeta.ipAddress,
      metadata: { fromWallet, toWallet, amount }
    }, 400, 'Insufficient balance.');
  }

  await walletRepository.createTransaction(client, {
    userId,
    txType: 'debit',
    source: 'wallet_transfer',
    amount,
    referenceId: null,
    fromWallet,
    toWallet,
    status: 'success',
    referenceCode,
    metadata: {
      transferType: 'wallet',
      walletType: 'transfer',
      walletBreakdown: {
        income: toMoney(updatedWallet.debited_income_balance || 0),
        deposit: toMoney(updatedWallet.debited_deposit_balance || 0),
        bonus: toMoney(updatedWallet.debited_bonus_balance || 0)
      }
    }
  });

  return {
    fromWallet,
    toWallet,
    amount,
    reference: referenceCode,
    wallet: normalizeWalletBalances(updatedWallet)
  };
}

async function debitDepositBalance(client, userId, amount, source, referenceId = null, metadata = {}, createdByAdminId = null) {
  if (Number(amount) <= 0) {
    throw new ApiError(400, 'Debit amount must be positive');
  }

  await walletRepository.createWallet(client, userId);
  const updatedWallet = await walletRepository.debitDepositBalanceIfSufficient(client, userId, Number(amount));

  if (!updatedWallet) {
    await logSecurityEvent(client, {
      userId,
      actionType: 'wallet_debit_blocked',
      reason: 'insufficient_balance',
      metadata: { source, amount: toMoney(amount), referenceId, walletType: 'deposit' }
    });
    throw new ApiError(400, 'Insufficient Deposit Wallet balance');
  }

  await walletRepository.createTransaction(client, {
    userId,
    txType: 'debit',
    source,
    amount,
    referenceId,
    metadata: {
      ...metadata,
      walletType: 'deposit',
      walletBreakdown: {
        deposit: toMoney(updatedWallet.debited_deposit_balance || 0)
      }
    },
    createdByAdminId
  });

  return {
    ...normalizeWalletBalances(updatedWallet),
    debitBreakdown: {
      deposit: toMoney(updatedWallet.debited_deposit_balance || 0)
    }
  };
}

async function getWelcomeSpinStatus(client, userId) {
  const state = await userRepository.getWelcomeSpinState(client, userId);
  if (!state) {
    throw new ApiError(404, 'User not found');
  }

  const eligible = Boolean(state.welcome_spin_eligible) && !Boolean(state.has_claimed_welcome_spin);
  return {
    eligible,
    claimed: Boolean(state.has_claimed_welcome_spin),
    claimedAt: state.welcome_spin_claimed_at || null,
    rewardAmount: state.welcome_spin_reward_amount === null || state.welcome_spin_reward_amount === undefined
      ? null
      : toMoney(state.welcome_spin_reward_amount)
  };
}

async function claimWelcomeSpin(client, userId, options = {}) {
  const requestMeta = sanitizeRequestMeta(options.requestMeta);
  const recentClaimAttempts = await walletRepository.countRecentSecurityEvents(client, {
    userId,
    actionType: 'welcome_spin_claim_attempt',
    sinceSeconds: WELCOME_SPIN_ATTEMPT_WINDOW_SECONDS
  });
  if (recentClaimAttempts >= WELCOME_SPIN_ATTEMPT_LIMIT) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'welcome_spin_blocked',
      reason: 'rate_limited',
      ipAddress: requestMeta.ipAddress,
      metadata: { recentClaimAttempts, windowSeconds: WELCOME_SPIN_ATTEMPT_WINDOW_SECONDS }
    }, 429, 'Too many attempts. Please try again later.');
  }

  await logSecurityEvent(client, {
    userId,
    actionType: 'welcome_spin_claim_attempt',
    reason: 'attempt',
    ipAddress: requestMeta.ipAddress
  });

  const state = await userRepository.getWelcomeSpinState(client, userId, { forUpdate: true });
  if (!state) {
    throw new ApiError(404, 'User not found');
  }

  if (state.has_claimed_welcome_spin) {
    await logSecurityEvent(client, {
      userId,
      actionType: 'welcome_spin_duplicate',
      reason: 'already_claimed',
      ipAddress: requestMeta.ipAddress
    });
    const wallet = normalizeWalletBalances(await walletRepository.getWallet(client, userId));
    return {
      claimed: true,
      rewardAmount: toMoney(state.welcome_spin_reward_amount || 0),
      auctionBonusBalance: toMoney(wallet?.bonus_balance || wallet?.auction_bonus_balance || 0),
      alreadyClaimed: true
    };
  }

  if (!state.welcome_spin_eligible) {
    await blockWithSecurityLog(client, {
      userId,
      actionType: 'welcome_spin_blocked',
      reason: 'not_eligible',
      ipAddress: requestMeta.ipAddress
    }, 403, 'This reward has already been claimed.');
  }

  const rewardAmount = pickWelcomeSpinReward();
  await walletRepository.createWallet(client, userId);
  await userRepository.markWelcomeSpinClaimed(client, userId, rewardAmount);
  const wallet = await walletRepository.adjustAuctionBonusBalance(client, userId, rewardAmount);
  await walletRepository.createTransaction(client, {
    userId,
    txType: 'credit',
    source: 'welcome_spin_bonus',
    amount: rewardAmount,
    referenceId: null,
    metadata: {
      walletType: 'bonus',
      rewardType: 'welcome_spin',
      auctionOnly: true
    }
  });

  return {
    claimed: true,
    rewardAmount,
    auctionBonusBalance: toMoney(wallet?.bonus_balance || wallet?.auction_bonus_balance || 0),
    alreadyClaimed: false
  };
}

async function getHubHistory(client, userId) {
  return withPerfSpan(`wallet.history:${userId}`, async () => {
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
  }, { thresholdMs: 120 });
}

module.exports = {
  MIN_DEPOSIT_AMOUNT,
  MIN_WITHDRAWAL_AMOUNT,
  credit,
  creditWithTransaction,
  debit,
  debitDepositBalance,
  debitForAuctionEntry,
  createWalletTransfer,
  creditBtct,
  getWalletSummary,
  bindWalletAddress,
  getDepositWalletConfig,
  createDepositRequest,
  createWithdrawalRequest,
  createP2pTransfer,
  getHubHistory,
  getWelcomeSpinStatus,
  claimWelcomeSpin
};

