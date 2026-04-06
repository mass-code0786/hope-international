const express = require('express');
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  compensationWeeklyQuerySchema,
  compensationMonthlyQuerySchema,
  userAddressQuerySchema,
  userAddressCreateSchema,
  userAddressUpdateSchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/me', auth(), userController.me);
router.get('/me/children', auth(), userController.myChildren);
router.get('/me/team/summary', auth(), userController.myTeamSummary);
router.get('/me/team/tree', auth(), userController.myTeamTreeRoot);
router.get('/me/team/tree/:memberId', auth(), userController.myTeamTreeNode);
router.get('/me/compensation/weekly', auth(), validate(compensationWeeklyQuerySchema), userController.weeklyCompensation);
router.get('/me/compensation/monthly', auth(), validate(compensationMonthlyQuerySchema), userController.monthlyCompensation);
router.get('/me/address', auth(), validate(userAddressQuerySchema), userController.getAddress);
router.post('/me/address', auth(), validate(userAddressCreateSchema), userController.createAddress);
router.patch('/me/address', auth(), validate(userAddressUpdateSchema), userController.updateAddress);

module.exports = router;
