const express = require('express');
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { compensationWeeklyQuerySchema, compensationMonthlyQuerySchema } = require('../utils/schemas');

const router = express.Router();

router.get('/me', auth(), userController.me);
router.get('/me/children', auth(), userController.myChildren);
router.get('/me/team/summary', auth(), userController.myTeamSummary);
router.get('/me/compensation/weekly', auth(), validate(compensationWeeklyQuerySchema), userController.weeklyCompensation);
router.get('/me/compensation/monthly', auth(), validate(compensationMonthlyQuerySchema), userController.monthlyCompensation);

module.exports = router;
