const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const auctionService = require('../services/auctionService');

const list = asyncHandler(async (req, res) => {
  const result = await auctionService.listAuctions(req.user?.sub || null, {
    status: req.query.status,
    search: req.query.search
  }, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Auctions fetched successfully'
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await auctionService.getAuctionDetails(req.params.id, req.user.sub);
  return success(res, {
    data,
    message: 'Auction fetched successfully'
  });
});

const placeBid = asyncHandler(async (req, res) => {
  const data = await auctionService.placeBid(req.params.id, req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Bid placed successfully'
  });
});

const myHistory = asyncHandler(async (req, res) => {
  const result = await auctionService.listMyAuctionHistory(req.user.sub, {
    kind: req.query.kind
  }, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    summary: result.summary,
    pagination: result.pagination,
    message: 'Auction history fetched successfully'
  });
});

module.exports = {
  list,
  getById,
  placeBid,
  myHistory
};
