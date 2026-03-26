const express = require('express');
const validate = require('../../middleware/validate');
const { blockDemoSession } = require('../../middleware/auth');
const adminSettingsController = require('../../controllers/admin/adminSettingsController');
const { settingsUpdateSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', adminSettingsController.get);
router.patch('/', blockDemoSession('Settings updates'), validate(settingsUpdateSchema), adminSettingsController.update);

module.exports = router;
