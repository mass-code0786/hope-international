const express = require('express');
const walletController = require('../controllers/walletController');
const { auth, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  walletAdjustSchema,
  walletBindSchema,
  walletDepositSchema,
  walletTransferSchema,
  walletWithdrawalSchema,
  walletP2pSchema,
  walletBtctStakingStartSchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/', auth(), walletController.summary);
router.get('/history', auth(), walletController.history);
router.get('/deposit-config', auth(), walletController.depositConfig);
router.get('/deposits', auth(), walletController.depositList);
router.post('/deposits', auth(), validate(walletDepositSchema), walletController.depositCreate);
router.get('/withdrawals', auth(), walletController.withdrawalList);
router.post('/withdrawals', auth(), validate(walletWithdrawalSchema), walletController.withdrawalCreate);
router.post('/transfer', auth(), validate(walletTransferSchema), walletController.transferCreate);
router.get('/p2p', auth(), walletController.p2pList);
router.get('/staking', auth(), walletController.stakingSummary);
router.post('/staking/start', auth(), validate(walletBtctStakingStartSchema), walletController.stakingStart);
router.post('/p2p', auth(), validate(walletP2pSchema), walletController.p2pCreate);
router.post('/bind', auth(), validate(walletBindSchema), walletController.bindWallet);
router.post('/adjust', auth(), requireAdmin, validate(walletAdjustSchema), walletController.adjust);

module.exports = router;
