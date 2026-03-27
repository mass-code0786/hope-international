const express = require('express');
const validate = require('../../middleware/validate');
const adminBannersController = require('../../controllers/admin/adminBannersController');
const {
  adminBannersQuerySchema,
  adminBannerCreateSchema,
  adminBannerUpdateSchema,
  adminBannerIdParamSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', validate(adminBannersQuerySchema), adminBannersController.list);
router.post('/', validate(adminBannerCreateSchema), adminBannersController.create);
router.patch('/:id', validate(adminBannerUpdateSchema), adminBannersController.update);
router.delete('/:id', validate(adminBannerIdParamSchema), adminBannersController.remove);

module.exports = router;
