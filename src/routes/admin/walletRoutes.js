const express = require('express');
const { requireSuperAdmin } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const adminWalletController = require('../../controllers/admin/adminWalletController');
const {
  adminWalletTransactionsQuerySchema,
  adminWalletAdjustSchema,
  adminWalletUsersQuerySchema,
  adminWalletUserParamSchema,
  adminWalletFreezeSchema,
  adminWalletLogsQuerySchema,
  adminFinanceListQuerySchema,
  adminPaymentSyncParamSchema,
  adminWalletReviewSchema,
  adminWalletBindingUpsertSchema,
  adminWalletBindingParamSchema,
  adminBtctStakingPayoutRunSchema,
  adminUserIdParamSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/transactions', validate(adminWalletTransactionsQuerySchema), adminWalletController.transactions);
router.get('/summary', adminWalletController.summary);
router.get('/users', validate(adminWalletUsersQuerySchema), adminWalletController.users);
router.get('/users/:userId', validate(adminWalletUserParamSchema), adminWalletController.user);
router.get('/logs', validate(adminWalletLogsQuerySchema), adminWalletController.logs);

router.get('/nowpayments', requireSuperAdmin, validate(adminFinanceListQuerySchema), adminWalletController.nowPayments);
router.get('/nowpayments/:id', requireSuperAdmin, validate(adminPaymentSyncParamSchema), adminWalletController.nowPaymentsDetail);
router.post('/nowpayments/:id/sync', requireSuperAdmin, validate(adminPaymentSyncParamSchema), adminWalletController.syncNowPaymentsDeposit);

router.get('/withdrawals', validate(adminFinanceListQuerySchema), adminWalletController.withdrawals);
router.patch('/withdrawals/:id/status', validate(adminWalletReviewSchema), adminWalletController.reviewWithdrawal);

router.get('/p2p', validate(adminFinanceListQuerySchema), adminWalletController.p2p);

router.get('/bindings', validate(adminFinanceListQuerySchema), adminWalletController.bindings);
router.patch('/bindings/:userId', validate(adminWalletBindingUpsertSchema), adminWalletController.upsertBinding);
router.delete('/bindings/:userId', validate(adminWalletBindingParamSchema), adminWalletController.removeBinding);

router.get('/income', validate(adminFinanceListQuerySchema), adminWalletController.income);
router.get('/staking', adminWalletController.btctStaking);
router.post('/staking/payouts/run', validate(adminBtctStakingPayoutRunSchema), adminWalletController.runBtctStakingPayouts);
router.get('/users/:id/financial-overview', validate(adminUserIdParamSchema), adminWalletController.userFinancialOverview);

router.post('/adjust', validate(adminWalletAdjustSchema), adminWalletController.adjust);
router.post('/freeze', validate(adminWalletFreezeSchema), adminWalletController.freeze);
router.post('/unfreeze', validate(adminWalletFreezeSchema), adminWalletController.unfreeze);

module.exports = router;
