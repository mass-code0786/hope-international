const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminUsersService = require('../../services/admin/adminUsersService');

const list = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    rank: req.query.rank,
    status: req.query.status,
    joinedFrom: req.query.joinedFrom,
    joinedTo: req.query.joinedTo
  };

  const result = await adminUsersService.listUsers(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin users fetched successfully'
  });
});

const search = asyncHandler(async (req, res) => {
  const result = await adminUsersService.searchUsers(
    { q: req.query.q },
    {
      page: req.query.page,
      limit: req.query.limit
    }
  );

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
    message: 'Admin user search results fetched successfully'
  });
});

const listRanks = asyncHandler(async (_req, res) => {
  const result = await adminUsersService.listRanks();
  return success(res, {
    data: result.data,
    summary: result.summary,
    message: 'Admin ranks fetched successfully'
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await adminUsersService.getUserDetails(req.params.id);
  return success(res, {
    data,
    message: 'Admin user details fetched successfully'
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await adminUsersService.updateUserStatus(req.user.sub, req.params.id, req.body.isActive);
  return success(res, {
    data,
    message: 'User status updated successfully'
  });
});

const updateRank = asyncHandler(async (req, res) => {
  const data = await adminUsersService.updateUserRank(req.user.sub, req.params.id, req.body.rankId);
  return success(res, {
    data,
    message: 'User rank updated successfully'
  });
});

module.exports = {
  list,
  search,
  listRanks,
  getById,
  updateStatus,
  updateRank
};
