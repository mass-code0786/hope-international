const express = require('express');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const donationController = require('../controllers/donationController');
const {
  donationCreateSchema,
  donationsListQuerySchema
} = require('../utils/schemas');

const router = express.Router();

router.post('/', auth(), validate(donationCreateSchema), donationController.createDonation);
router.get('/my', auth(), validate(donationsListQuerySchema), donationController.myDonations);

module.exports = router;
