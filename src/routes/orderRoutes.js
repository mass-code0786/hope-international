const express = require('express');
const orderController = require('../controllers/orderController');
const { auth, blockDemoSession } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { orderCreateSchema } = require('../utils/schemas');

const router = express.Router();

router.get('/', auth(), orderController.listMine);
router.post('/', auth(), blockDemoSession('Order placement'), validate(orderCreateSchema), orderController.create);

module.exports = router;
