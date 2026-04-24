const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const donationService = require('../services/donationService');

const createDonation = asyncHandler(async (req, res) => {
  const data = await donationService.createDonation(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Donation submitted successfully'
  });
});

const myDonations = asyncHandler(async (req, res) => {
  const result = await donationService.listUserDonations(req.user.sub, req.query);
  return res.status(200).json({
    items: result.items,
    pagination: result.pagination
  });
});

module.exports = {
  createDonation,
  myDonations
};
