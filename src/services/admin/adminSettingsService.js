const { withTransaction } = require('../../db/pool');
const adminRepository = require('../../repositories/adminRepository');
const { DEFAULT_RANKS, MONTHLY_REWARD_THRESHOLDS, MATCH_PERCENTAGE, DIRECT_INCOME_PERCENTAGE, PV_TO_BV_RATIO } = require('../../config/constants');

async function getSettings() {
  const rows = await adminRepository.getSettings(null);
  const map = new Map(rows.map((r) => [r.setting_key, r.setting_value]));
  const storedRankMultipliers = map.get('rank_multipliers');
  const storedRewardSlabs = map.get('reward_slabs');

  return {
    compensationSettings: map.get('compensation_settings') || {
      matchPercentage: MATCH_PERCENTAGE * 100,
      directPercentage: DIRECT_INCOME_PERCENTAGE * 100,
      pvBvRatio: PV_TO_BV_RATIO,
      carryForward: false
    },
    rankMultipliers: Array.isArray(storedRankMultipliers) && storedRankMultipliers.length
      ? storedRankMultipliers
      : DEFAULT_RANKS.map((r) => ({ name: r.name, capMultiplier: r.capMultiplier })),
    rewardSlabs: Array.isArray(storedRewardSlabs) && storedRewardSlabs.length
      ? storedRewardSlabs
      : MONTHLY_REWARD_THRESHOLDS
  };
}

async function updateSettings(adminUserId, payload) {
  return withTransaction(async (client) => {
    const updated = {};

    if (payload.compensationSettings) {
      updated.compensationSettings = await adminRepository.upsertSetting(client, 'compensation_settings', payload.compensationSettings, adminUserId);
    }
    if (payload.rankMultipliers) {
      updated.rankMultipliers = await adminRepository.upsertSetting(client, 'rank_multipliers', payload.rankMultipliers, adminUserId);
    }
    if (payload.rewardSlabs) {
      updated.rewardSlabs = await adminRepository.upsertSetting(client, 'reward_slabs', payload.rewardSlabs, adminUserId);
    }

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'settings.update',
      targetEntity: 'app_settings',
      targetId: 'multiple',
      beforeData: null,
      afterData: updated,
      metadata: { keys: Object.keys(payload || {}) }
    });

    return getSettings();
  });
}

module.exports = {
  getSettings,
  updateSettings
};
