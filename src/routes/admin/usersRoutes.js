const express = require('express');
const validate = require('../../middleware/validate');
const adminUsersController = require('../../controllers/admin/adminUsersController');
const {
  adminUsersQuerySchema,
  adminUserSearchQuerySchema,
  adminUserIdParamSchema,
  adminUserStatusSchema,
  adminUserRankSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', validate(adminUsersQuerySchema), adminUsersController.list);
router.get('/search', validate(adminUserSearchQuerySchema), adminUsersController.search);
router.get('/:id', validate(adminUserIdParamSchema), adminUsersController.getById);
router.patch('/:id/status', validate(adminUserStatusSchema), adminUsersController.updateStatus);
router.patch('/:id/rank', validate(adminUserRankSchema), adminUsersController.updateRank);

module.exports = router;
