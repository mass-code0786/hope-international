const express = require('express');
const walletController = require('../controllers/walletController');
const { auth, requireAdmin, blockDemoSession } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { walletAdjustSchema } = require('../utils/schemas');

const router = express.Router();

router.get('/', auth(), walletController.summary);
router.post('/adjust', auth(), requireAdmin, blockDemoSession('Wallet adjustments'), validate(walletAdjustSchema), walletController.adjust);

module.exports = router;
