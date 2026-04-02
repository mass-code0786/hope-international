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

  return {
    ...item,
    method: 'crypto',
    asset: item.asset || details.asset || 'USDT',
    network: item.network || details.network || 'BEP20',
    transaction_reference: transactionReference,
    tx_hash: transactionReference,
    wallet_address_snapshot: walletAddressSnapshot,
    proof_image_url: proofImageUrl,
    note: item.instructions || details.note || null,
    details
  };
}

const summary = asyncHandler(async (req, res) => {
  const data = await walletService.getWalletSummary(null, req.user.sub);
  return success(res, {
    data,
    message: 'Wallet summary fetched successfully'
  });
});

const history = asyncHandler(async (req, res) => {
  const type = String(req.query.type || 'all').toLowerCase();
  const userId = req.user.sub;

  if (type === 'deposit') {
    const data = (await walletRepository.listDepositRequests(null, userId, 300)).map(normalizeDepositRecord);
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
      deposits: Array.isArray(data.deposits) ? data.deposits.map(normalizeDepositRecord) : []
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

const depositConfig = asyncHandler(async (_req, res) => {
  const data = await walletService.getDepositWalletConfig(null);
  return success(res, {
    data,
    message: 'Deposit wallet fetched successfully'
  });
});

const depositCreate = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (client) => walletService.createDepositRequest(client, req.user.sub, req.body));
  return success(res, {
    data: normalizeDepositRecord(data),
    message: 'USDT BEP20 deposit request submitted successfully',
    statusCode: 201
  });
});

const depositList = asyncHandler(async (req, res) => {
  const data = (await walletRepository.listDepositRequests(null, req.user.sub, 300)).map(normalizeDepositRecord);
  return success(res, {
    data,
    message: 'Deposit requests fetched successfully'
  });
});

const withdrawalCreate = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (client) => walletService.createWithdrawalRequest(client, req.user.sub, req.body));
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
  depositConfig,
  depositCreate,
  depositList,
  withdrawalCreate,
  withdrawalList,
  p2pCreate,
  p2pList,
  stakingSummary,
  stakingStart,
  adjust
};
