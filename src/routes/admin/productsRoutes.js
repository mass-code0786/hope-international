const express = require('express');
const validate = require('../../middleware/validate');
const adminProductsController = require('../../controllers/admin/adminProductsController');
const {
  adminProductsQuerySchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminProductIdParamSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', validate(adminProductsQuerySchema), adminProductsController.list);
router.get('/:id', validate(adminProductIdParamSchema), adminProductsController.getById);
router.post('/', validate(adminProductCreateSchema), adminProductsController.create);
router.patch('/:id', validate(adminProductUpdateSchema), adminProductsController.update);

module.exports = router;
