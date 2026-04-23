const express = require('express');
const autopoolController = require('../controllers/autopoolController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  autopoolOverviewQuerySchema,
  autopoolHistoryQuerySchema,
  autopoolEnterSchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/', auth(), validate(autopoolOverviewQuerySchema), autopoolController.summary);
router.get('/history', auth(), validate(autopoolHistoryQuerySchema), autopoolController.history);
router.post('/enter', auth(), validate(autopoolEnterSchema), autopoolController.enter);

module.exports = router;
