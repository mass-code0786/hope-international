const express = require('express');
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { orderCreateSchema } = require('../utils/schemas');

const router = express.Router();

router.get('/', auth(), orderController.listMine);
router.post('/', auth(), validate(orderCreateSchema), orderController.create);

module.exports = router;
