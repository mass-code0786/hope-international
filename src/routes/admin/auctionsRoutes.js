const express = require('express');
const validate = require('../../middleware/validate');
const adminAuctionsController = require('../../controllers/admin/adminAuctionsController');
const {
  adminAuctionsQuerySchema,
  adminAuctionCreateSchema,
  adminAuctionUpdateSchema,
  adminAuctionIdParamSchema,
  adminAuctionActionSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', validate(adminAuctionsQuerySchema), adminAuctionsController.list);
router.get('/:id', validate(adminAuctionIdParamSchema), adminAuctionsController.getById);
router.post('/', validate(adminAuctionCreateSchema), adminAuctionsController.create);
router.patch('/:id', validate(adminAuctionUpdateSchema), adminAuctionsController.update);
router.post('/:id/actions', validate(adminAuctionActionSchema), adminAuctionsController.changeState);

module.exports = router;
