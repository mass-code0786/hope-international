const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');
const compensationService = require('../services/compensationService');
const { sanitizeUser } = require('../utils/sanitize');

const me = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.sub);
  res.status(200).json(sanitizeUser(user));
});

const myChildren = asyncHandler(async (req, res) => {
  const children = await userService.getChildren(req.user.sub);
  res.status(200).json(children.map(sanitizeUser));
});

const weeklyCompensation = asyncHandler(async (req, res) => {
  const data = await compensationService.getWeeklyStatus(req.user.sub, req.query.cycleStart, req.query.cycleEnd);
  res.status(200).json(data);
});

const monthlyCompensation = asyncHandler(async (req, res) => {
  const data = await compensationService.getMonthlyStatus(req.user.sub, req.query.monthStart, req.query.monthEnd);
  res.status(200).json(data);
});

module.exports = {
  me,
  myChildren,
  weeklyCompensation,
  monthlyCompensation
};
