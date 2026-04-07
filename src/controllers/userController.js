const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');
const compensationService = require('../services/compensationService');
const { sanitizeUser } = require('../utils/sanitize');
const { success } = require('../utils/response');

const me = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.sub);
  res.status(200).json(sanitizeUser(user));
});

const myChildren = asyncHandler(async (req, res) => {
  const children = await userService.getChildren(req.user.sub);
  res.status(200).json(children.map(sanitizeUser));
});

const myTeamSummary = asyncHandler(async (req, res) => {
  const summary = await userService.getTeamSummary(req.user.sub);
  res.status(200).json(summary || {});
});

const myTeamTreeRoot = asyncHandler(async (req, res) => {
  const tree = await userService.getTeamTreeRoot(req.user.sub);
  res.status(200).json(tree);
});

const myTeamTreeNode = asyncHandler(async (req, res) => {
  const tree = await userService.getTeamTreeNode(req.user.sub, req.params.memberId);
  res.status(200).json(tree);
});

const weeklyCompensation = asyncHandler(async (req, res) => {
  const data = await compensationService.getWeeklyStatus(req.user.sub, req.query.cycleStart, req.query.cycleEnd);
  res.status(200).json(data);
});

const monthlyCompensation = asyncHandler(async (req, res) => {
  const data = await compensationService.getMonthlyStatus(req.user.sub, req.query.monthStart, req.query.monthEnd);
  res.status(200).json(data);
});

const getAddress = asyncHandler(async (req, res) => {
  const data = await userService.getAddress(req.user.sub);
  return success(res, {
    data,
    message: 'Address fetched successfully'
  });
});

const createAddress = asyncHandler(async (req, res) => {
  const data = await userService.saveAddress(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Address saved successfully'
  });
});

const updateAddress = asyncHandler(async (req, res) => {
  const data = await userService.saveAddress(req.user.sub, req.body);
  return success(res, {
    data,
    message: 'Address updated successfully'
  });
});

const welcomeSpinStatus = asyncHandler(async (req, res) => {
  const data = await userService.getWelcomeSpinStatus(req.user.sub);
  return success(res, {
    data,
    message: data.eligible ? 'Eligible for welcome spin' : data.claimed ? 'Welcome spin already claimed' : 'Welcome spin is not available'
  });
});

const claimWelcomeSpin = asyncHandler(async (req, res) => {
  const data = await userService.claimWelcomeSpin(req.user.sub, {
    requestMeta: {
      ipAddress: req.ip
    }
  });
  return success(res, {
    data,
    message: data.alreadyClaimed ? 'Welcome reward already claimed' : 'Welcome reward claimed successfully'
  });
});

const webauthnStatus = asyncHandler(async (req, res) => {
  const data = await userService.getWebauthnStatus(req.user.sub);
  return success(res, {
    data,
    message: data.enabled ? 'Biometric login is enabled' : 'Biometric login is not enabled'
  });
});

const removeWebauthnCredential = asyncHandler(async (req, res) => {
  const data = await userService.removeWebauthnCredential(req.user.sub, req.params.credentialId);
  return success(res, {
    data,
    message: 'Biometric credential removed successfully'
  });
});

module.exports = {
  me,
  myChildren,
  myTeamSummary,
  myTeamTreeRoot,
  myTeamTreeNode,
  weeklyCompensation,
  monthlyCompensation,
  getAddress,
  createAddress,
  updateAddress,
  welcomeSpinStatus,
  claimWelcomeSpin,
  webauthnStatus,
  removeWebauthnCredential
};
