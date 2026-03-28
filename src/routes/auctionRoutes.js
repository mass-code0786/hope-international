const express = require('express');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const auctionController = require('../controllers/auctionController');
const {
  auctionListQuerySchema,
  auctionIdParamSchema,
  auctionBidSchema,
  auctionHistoryQuerySchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/', auth(false), validate(auctionListQuerySchema), auctionController.list);
router.get('/me/history', auth(), validate(auctionHistoryQuerySchema), auctionController.myHistory);
router.get('/:id', auth(), validate(auctionIdParamSchema), auctionController.getById);
router.post('/:id/bids', auth(), validate(auctionBidSchema), auctionController.placeBid);

module.exports = router;
