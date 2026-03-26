const express = require('express');
const validate = require('../../middleware/validate');
const adminWalletController = require('../../controllers/admin/adminWalletController');
const { adminWalletTransactionsQuerySchema, adminWalletAdjustSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/transactions', validate(adminWalletTransactionsQuerySchema), adminWalletController.transactions);
router.get('/summary', adminWalletController.summary);
router.post('/adjust', validate(adminWalletAdjustSchema), adminWalletController.adjust);

module.exports = router;
