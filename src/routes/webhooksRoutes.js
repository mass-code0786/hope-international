const express = require('express');
const webhooksController = require('../controllers/webhooksController');

const router = express.Router();

router.post('/webhooks/nowpayments', express.raw({ type: 'application/json' }), webhooksController.nowPaymentsWebhook);
router.post('/payments/nowpayments/webhook', express.raw({ type: 'application/json' }), webhooksController.nowPaymentsWebhook);

module.exports = router;
