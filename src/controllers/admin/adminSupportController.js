const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminSupportService = require('../../services/admin/adminSupportService');

const listThreads = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Number(req.query.limit) || 100);

  try {
    const result = await adminSupportService.listSupportThreads(req.query, req.query);
    return success(res, {
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
      message: result.data.length ? 'Support inbox fetched successfully' : 'No support threads'
    });
  } catch (error) {
    console.error('[admin.support.threads] failed', error);
    return success(res, {
      data: [],
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0
      },
      summary: {},
      message: 'Safe fallback'
    });
  }
});

const getThread = asyncHandler(async (req, res) => {
  const data = await adminSupportService.getSupportThread(req.params.id);
  return success(res, {
    data,
    message: 'Support conversation fetched successfully'
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const data = await adminSupportService.replyToSupportThread(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Support reply sent successfully'
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await adminSupportService.updateSupportThreadStatus(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    message: 'Support status updated successfully'
  });
});

module.exports = {
  listThreads,
  getThread,
  sendMessage,
  updateStatus
};
