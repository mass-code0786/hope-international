const userRepository = require('../repositories/userRepository');
const adminRepository = require('../repositories/adminRepository');
const { ApiError } = require('../utils/ApiError');

async function getProfile(userId) {
  const user = await userRepository.findById(null, userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

async function getChildren(userId) {
  return userRepository.getDirectChildren(null, userId);
}

async function getTeamSummary(userId) {
  return adminRepository.getTeamSummary(null, userId);
}

module.exports = {
  getProfile,
  getChildren,
  getTeamSummary
};
