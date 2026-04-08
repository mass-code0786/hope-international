const express = require('express');
const paymentsController = require('../controllers/paymentsController');

const router = express.Router();

router.post('/nowpayments/webhook', express.raw({ type: 'application/json' }), paymentsController.nowPaymentsWebhook);

module.exports = router;
