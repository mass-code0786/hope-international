const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { ApiError } = require('../utils/ApiError');
const supportService = require('../services/supportService');

function getAuthenticatedUserId(req) {
  if (!req.user?.sub) {
    throw new ApiError(401, 'Authenticated user context is required');
  }
  return req.user.sub;
}

const listThreads = asyncHandler(async (req, res) => {
  const result = await supportService.listUserThreads(getAuthenticatedUserId(req), req.query, req.query);
  return success(res, {
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
    message: 'Support conversations fetched successfully'
  });
});

const createThread = asyncHandler(async (req, res) => {
  const data = await supportService.createUserThread(getAuthenticatedUserId(req), req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Support conversation created successfully'
  });
});

const getThread = asyncHandler(async (req, res) => {
  const data = await supportService.getUserThread(getAuthenticatedUserId(req), req.params.id);
  return success(res, {
    data,
    message: 'Support conversation fetched successfully'
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const data = await supportService.sendUserMessage(getAuthenticatedUserId(req), req.params.id, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Support message sent successfully'
  });
});

module.exports = {
  listThreads,
  createThread,
  getThread,
  sendMessage
};