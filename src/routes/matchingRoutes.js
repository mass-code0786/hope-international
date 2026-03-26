const express = require('express');
const matchingController = require('../controllers/matchingController');
const { auth, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { matchingRunSchema, matchingResultQuerySchema, monthlyRewardRunSchema } = require('../utils/schemas');

const router = express.Router();

router.get('/runs', auth(), requireAdmin, matchingController.runs);
router.get('/runs/:cycleId/results', auth(), requireAdmin, validate(matchingResultQuerySchema), matchingController.runResults);
router.post('/run', auth(), requireAdmin, validate(matchingRunSchema), matchingController.run);
router.post('/rewards/monthly/run', auth(), requireAdmin, validate(monthlyRewardRunSchema), matchingController.runMonthlyRewards);

module.exports = router;
