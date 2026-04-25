const express = require('express');
const { requireSuperAdmin } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const adminDepositsController = require('../../controllers/admin/adminDepositsController');
const {
  adminDepositsQuerySchema,
  adminDepositIdParamSchema,
  adminDepositRejectSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.use(requireSuperAdmin);

router.get('/', validate(adminDepositsQuerySchema), adminDepositsController.list);
router.post('/:id/approve', validate(adminDepositIdParamSchema), adminDepositsController.approve);
router.post('/:id/reject', validate(adminDepositRejectSchema), adminDepositsController.reject);

module.exports = router;
