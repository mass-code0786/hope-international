const express = require('express');
const { requireSuperAdmin } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const adminDepositsController = require('../../controllers/admin/adminDepositsController');
const { adminTransferCreateSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.use(requireSuperAdmin);

router.post('/', validate(adminTransferCreateSchema), adminDepositsController.transfer);

module.exports = router;
