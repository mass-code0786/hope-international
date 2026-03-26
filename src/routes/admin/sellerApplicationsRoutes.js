const express = require('express');
const validate = require('../../middleware/validate');
const adminSellerApplicationsController = require('../../controllers/admin/adminSellerApplicationsController');
const { adminSellerApplicationsQuerySchema, adminSellerApplicationReviewSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', validate(adminSellerApplicationsQuerySchema), adminSellerApplicationsController.list);
router.patch('/:id', validate(adminSellerApplicationReviewSchema), adminSellerApplicationsController.review);

module.exports = router;
