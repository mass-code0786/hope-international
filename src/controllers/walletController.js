const asyncHandler = require('../utils/asyncHandler');
const { withTransaction } = require('../db/pool');
const walletService = require('../services/walletService');

const summary = asyncHandler(async (req, res) => {
  const data = await walletService.getWalletSummary(null, req.user.sub);
  res.status(200).json(data);
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
  adjust
};
