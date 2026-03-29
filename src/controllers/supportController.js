const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const supportService = require('../services/supportService');

const listThreads = asyncHandler(async (req, res) => {
  const result = await supportService.listUserThreads(req.user.sub, req.query, req.query);
  return success(res, {
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
    message: 'Support conversations fetched successfully'
  });
});

const createThread = asyncHandler(async (req, res) => {
  const data = await supportService.createUserThread(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Support conversation created successfully'
  });
});

const getThread = asyncHandler(async (req, res) => {
  const data = await supportService.getUserThread(req.user.sub, req.params.id);
  return success(res, {
    data,
    message: 'Support conversation fetched successfully'
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const data = await supportService.sendUserMessage(req.user.sub, req.params.id, req.body);
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
