const express = require('express');
const validate = require('../../middleware/validate');
const adminSettingsController = require('../../controllers/admin/adminSettingsController');
const { settingsUpdateSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', adminSettingsController.get);
router.patch('/', validate(settingsUpdateSchema), adminSettingsController.update);

module.exports = router;
