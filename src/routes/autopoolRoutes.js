const express = require('express');
const autopoolController = require('../controllers/autopoolController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  autopoolOverviewQuerySchema,
  autopoolHistoryQuerySchema,
  autopoolEnterSchema,
  autopoolBuySchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/', auth(), validate(autopoolOverviewQuerySchema), autopoolController.summary);
router.get('/me', auth(), validate(autopoolOverviewQuerySchema), autopoolController.me);
router.get('/history', auth(), validate(autopoolHistoryQuerySchema), autopoolController.history);
router.post('/enter', auth(), validate(autopoolEnterSchema), autopoolController.enter);
router.post('/buy', auth(), validate(autopoolBuySchema), autopoolController.buy);

module.exports = router;
