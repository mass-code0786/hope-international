const express = require('express');
const productController = require('../controllers/productController');
const { auth, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { productCreateSchema } = require('../utils/schemas');

const router = express.Router();

router.get('/', auth(false), productController.list);
router.get('/:id', auth(false), productController.getById);
router.post('/', auth(), requireAdmin, validate(productCreateSchema), productController.create);

module.exports = router;
