const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminAuctionsService = require('../../services/admin/adminAuctionsService');

const list = asyncHandler(async (req, res) => {
  const result = await adminAuctionsService.listAuctions({
    status: req.query.status,
    search: req.query.search
  }, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin auctions fetched successfully'
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await adminAuctionsService.getAuction(req.params.id);
  return success(res, {
    data,
    message: 'Admin auction fetched successfully'
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await adminAuctionsService.createAuction(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Auction created successfully'
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await adminAuctionsService.updateAuction(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    message: 'Auction updated successfully'
  });
});

const changeState = asyncHandler(async (req, res) => {
  const data = await adminAuctionsService.changeAuctionState(req.user.sub, req.params.id, req.body.action, req.body.reason);
  return success(res, {
    data,
    message: `Auction ${req.body.action}d successfully`
  });
});

module.exports = {
  list,
  getById,
  create,
  update,
  changeState
};
