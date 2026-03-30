const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const auctionService = require('../services/auctionService');

function normalizeListQuery(query = {}) {
  const statusAliases = {
    active: 'live'
  };
  const status = typeof query.status === 'string' ? query.status.trim().toLowerCase() : undefined;
  const normalizedStatus = statusAliases[status] || status;
  const safeStatus = ['live', 'upcoming', 'ended', 'cancelled'].includes(normalizedStatus) ? normalizedStatus : undefined;
  const safeSearch = typeof query.search === 'string' && query.search.trim() ? query.search.trim().slice(0, 120) : undefined;
  const safePage = Number.isInteger(Number(query.page)) && Number(query.page) > 0 ? String(Number(query.page)) : '1';
  const safeLimit = String(Math.min(Number(query.limit) || 100, 100));

  return {
    filters: {
      status: safeStatus,
      search: safeSearch
    },
    pagination: {
      page: safePage,
      limit: safeLimit
    }
  };
}

const list = asyncHandler(async (req, res) => {
  const { filters, pagination } = normalizeListQuery(req.query);
  const result = await auctionService.listAuctions(req.user?.sub || null, filters, pagination);

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

