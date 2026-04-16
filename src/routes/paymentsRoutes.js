const express = require('express');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const paymentsController = require('../controllers/paymentsController');
const { nowPaymentsCreateSchema, paymentIdParamSchema } = require('../utils/schemas');

const router = express.Router();

router.post('/nowpayments/create', auth(), validate(nowPaymentsCreateSchema), paymentsController.createNowPaymentsPayment);
router.get('/:id', auth(), validate(paymentIdParamSchema), paymentsController.getPayment);
router.post('/:id/sync', auth(), validate(paymentIdParamSchema), paymentsController.syncPayment);

module.exports = router;
