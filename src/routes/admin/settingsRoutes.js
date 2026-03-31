const express = require('express');
const validate = require('../../middleware/validate');
const { requireSuperAdmin } = require('../../middleware/auth');
const adminSettingsController = require('../../controllers/admin/adminSettingsController');
const { settingsUpdateSchema, depositWalletSettingsUpdateSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', adminSettingsController.get);
router.patch('/', validate(settingsUpdateSchema), adminSettingsController.update);
router.get('/deposit-wallet', requireSuperAdmin, adminSettingsController.getDepositWallet);
router.patch('/deposit-wallet', requireSuperAdmin, validate(depositWalletSettingsUpdateSchema), adminSettingsController.updateDepositWallet);

module.exports = router;
