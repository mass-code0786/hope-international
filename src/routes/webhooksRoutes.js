const express = require('express');
const webhooksController = require('../controllers/webhooksController');

const router = express.Router();
const rawNowPaymentsWebhook = express.raw({
  type: () => true,
  limit: '1mb'
});

router.post('/webhooks/nowpayments', rawNowPaymentsWebhook, webhooksController.nowPaymentsWebhook);
router.post('/payments/nowpayments/webhook', rawNowPaymentsWebhook, webhooksController.nowPaymentsWebhook);

module.exports = router;
