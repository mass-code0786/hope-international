const asyncHandler = require('../utils/asyncHandler');
const { withTransaction } = require('../db/pool');
const walletService = require('../services/walletService');
const walletRepository = require('../repositories/walletRepository');
const btctStakingService = require('../services/btctStakingService');
const { success } = require('../utils/response');

function normalizeDepositRecord(item) {
  if (!item) return null;
  const details = item.details && typeof item.details === 'object' && !Array.isArray(item.details) ? item.details : {};
  const transactionReference = item.transaction_hash || details.transactionReference || details.txHash || null;
  const walletAddressSnapshot = item.wallet_address_snapshot || details.walletAddressSnapshot || details.walletAddress || null;
  const proofImageUrl = item.proof_image_url || details.proofImageUrl || null;
  const expiresAt = details.expiresAt || null;
  const locallyExpired = expiresAt
    && !item.is_processed
    && !['confirmed', 'finished', 'failed', 'expired'].includes(String(item.payment_status || '').toLowerCase())
    && new Date(expiresAt).getTime() <= Date.now();
  const paymentStatus = locallyExpired ? 'expired' : (item.payment_status || details.paymentStatus || null);
  const depositAmount = Number(item.amount || details.depositAmount || 0);
  const feeAmount = Number(details.feeAmount || 0);
  const totalPayableAmount = Number(details.totalPayableAmount || (depositAmount + feeAmount));

  return {
    ...item,
    method: 'crypto',
    asset: item.asset || details.asset || 'USDT',
    network: item.network || details.network || 'BEP20',
    transaction_reference: transactionReference,
    tx_hash: transactionReference,
    wallet_address_snapshot: walletAddressSnapshot,
    proof_image_url: proofImageUrl,
    payment_provider: item.payment_provider || details.provider || null,
    payment_record_id: item.payment_record_id || details.paymentRecordId || null,
    payment_id: item.payment_id || details.providerPaymentId || details.paymentId || null,
    payment_status: paymentStatus,
    order_id: item.order_id || null,
    pay_currency: item.pay_currency || details.payCurrency || null,
    pay_amount: item.pay_amount ?? details.payAmount ?? null,
    pay_address: item.pay_address || details.payAddress || walletAddressSnapshot || null,
    payment_url: item.payment_url || details.paymentUrl || null,
    expires_at: expiresAt,
    deposit_amount: depositAmount,
    fee_amount: feeAmount,
    total_payable_amount: totalPayableAmount,
    is_processed: Boolean(item.is_processed),
    processed_at: item.processed_at || null,
    note: item.instructions || details.note || null,
    details
  };
}

function isNowPaymentsDeposit(item) {
  return String(item?.payment_provider || '').toLowerCase() === 'nowpayments';
}

const summary = asyncHandler(async (req, res) => {
  const includeHistory = String(req.query.includeHistory || '').toLowerCase() === 'true';
  const data = await walletService.getWalletSummary(null, req.user.sub, { includeHistory });
  return success(res, {
    data,
    message: 'Wallet summary fetched successfully'
  });
});

const history = asyncHandler(async (req, res) => {
  const type = String(req.query.type || 'all').toLowerCase();
  const userId = req.user.sub;

  if (type === 'deposit') {
    const data = (await walletRepository.listDepositRequests(null, userId, 300))
      .map(normalizeDepositRecord)
      .filter(isNowPaymentsDeposit);
    return success(res, {
      data,
      message: 'Deposit requests fetched successfully'
    });
  }

  if (type === 'withdraw') {
    const data = await walletRepository.listWithdrawalRequests(null, userId, 300);
    return success(res, {
      data,
      message: 'Withdrawal requests fetched successfully'
    });
  }

  if (type === 'p2p') {
    const data = await walletRepository.listP2pTransfers(null, userId, 300);
    return success(res, {
      data,
      message: 'P2P transfers fetched successfully'
    });
  }

  const data = await walletService.getHubHistory(null, userId);
  return success(res, {
    data: {
      ...data,
      deposits: Array.isArray(data.deposits) ? data.deposits.map(normalizeDepositRecord).filter(isNowPaymentsDeposit) : []
    },
    message: 'Wallet history fetched successfully'
  });
});

const bindWallet = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (client) => walletService.bindWalletAddress(client, req.user.sub, req.body));
  return success(res, {
    data,
    message: 'Wallet binding updated successfully'
  });
});

const depositCreateNowPayments = asyncHandler(async (req, res) => {
  const paymentService = require('../services/paymentService');
  const data = await withTransaction(async (client) => paymentService.createNowPaymentsDepositPaymentWithClient(client, req.user.sub, {
    amount: req.body.amount,
    payCurrency: req.body.payCurrency,
    network: req.body.network
  }));

  return success(res, {
    data: normalizeDepositRecord({
      ...data.depositRequest,
      payment_record_id: data.payment?.id || null
    }),
    message: 'NOWPayments deposit created successfully',
    statusCode: 201
  });
});

const depositList = asyncHandler(async (req, res) => {
  const data = (await walletRepository.listDepositRequests(null, req.user.sub, 300))
    .map(normalizeDepositRecord)
    .filter(isNowPaymentsDeposit);
  return success(res, {
    data,
    message: 'Deposit requests fetched successfully'
  });
});

const withdrawalCreate = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (client) => walletService.createWithdrawalRequest(client, req.user.sub, {
    ...req.body,
    requestMeta: {
      ipAddress: req.ip
    }
  }));
  res.status(201).json(data);
});

const withdrawalList = asyncHandler(async (req, res) => {
  const data = await walletRepository.listWithdrawalRequests(null, req.user.sub, 300);
  res.status(200).json(data);
});

const p2pCreate = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (client) => walletService.createP2pTransfer(client, req.user.sub, req.body));
  res.status(201).json(data);
});

const transferCreate = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (client) => walletService.createWalletTransfer(client, req.user.sub, {
    ...req.body,
    requestMeta: {
      ipAddress: req.ip
    }
  }));
  return success(res, {
    data: {
      fromWallet: data.fromWallet,
      toWallet: data.toWallet,
      amount: data.amount,
      reference: data.reference
    },
    statusCode: 201,
    message: 'Transfer successful'
  });
});

const p2pList = asyncHandler(async (req, res) => {
  const data = await walletRepository.listP2pTransfers(null, req.user.sub, 300);
  res.status(200).json(data);
});

const stakingSummary = asyncHandler(async (req, res) => {
  const data = await btctStakingService.getUserStakingSummary(null, req.user.sub);
  return success(res, {
    data,
    message: 'BTCT staking summary fetched successfully'
  });
});

const stakingStart = asyncHandler(async (req, res) => {
  const data = await btctStakingService.startStaking(req.user.sub, {
    stakingAmountBtct: req.body?.stakingAmountBtct
  });
  return success(res, {
    data,
    statusCode: 201,
    message: 'BTCT staking started successfully'
  });
});

const adjust = asyncHandler(async (req, res) => {
  const { userId, amount, type, note } = req.body;
  const wallet = await withTransaction(async (client) => {
    if (type === 'credit') {
      return walletService.credit(client, userId, amount, 'manual_adjustment', null, { note });
    }
    return walletService.debit(client, userId, amount, 'manual_adjustment', null, { note });
  });
  res.status(200).json(wallet);
});

module.exports = {
  summary,
  history,
  bindWallet,
  depositCreateNowPayments,
  depositList,
  withdrawalCreate,
  withdrawalList,
  transferCreate,
  p2pCreate,
  p2pList,
  stakingSummary,
  stakingStart,
  adjust
};
