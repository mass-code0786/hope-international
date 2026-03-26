const userRepository = require('../repositories/userRepository');

async function refreshUserRank(client, userId) {
  const user = await userRepository.findById(client, userId);
  if (!user) {
    return null;
  }

  const targetRank = await userRepository.getRankByMinBv(client, user.lifetime_bv);
  if (!targetRank) {
    return null;
  }

  if (targetRank.id !== user.rank_id) {
    await userRepository.updateRank(client, userId, targetRank.id);
  }

  return targetRank;
}

module.exports = {
  refreshUserRank
};
