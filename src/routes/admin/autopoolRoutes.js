const express = require('express');
const validate = require('../../middleware/validate');
const { requireSuperAdmin } = require('../../middleware/auth');
const adminAutopoolController = require('../../controllers/admin/adminAutopoolController');
const { adminAutopoolResetSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.use(requireSuperAdmin);

router.post('/reset', validate(adminAutopoolResetSchema), adminAutopoolController.reset);

module.exports = router;
