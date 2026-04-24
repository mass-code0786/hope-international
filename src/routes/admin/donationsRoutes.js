const express = require('express');
const validate = require('../../middleware/validate');
const adminDonationController = require('../../controllers/admin/adminDonationController');
const { adminDonationsQuerySchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', validate(adminDonationsQuerySchema), adminDonationController.listDonations);

module.exports = router;
