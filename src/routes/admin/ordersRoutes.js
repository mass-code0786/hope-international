const express = require('express');
const validate = require('../../middleware/validate');
const adminOrdersController = require('../../controllers/admin/adminOrdersController');
const { adminOrdersQuerySchema, adminOrderIdParamSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', validate(adminOrdersQuerySchema), adminOrdersController.list);
router.get('/:id', validate(adminOrderIdParamSchema), adminOrdersController.getById);

module.exports = router;
