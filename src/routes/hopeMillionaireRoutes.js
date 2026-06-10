const express = require('express');
const hopeMillionaireController = require('../controllers/hopeMillionaireController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { hopeMillionaireDashboardSchema, hopeMillionaireJoinSchema } = require('../utils/schemas');

const router = express.Router();
router.get('/', auth(), validate(hopeMillionaireDashboardSchema), hopeMillionaireController.dashboard);
router.post('/join', auth(), validate(hopeMillionaireJoinSchema), hopeMillionaireController.join);

module.exports = router;
