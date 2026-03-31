const { withTransaction } = require('../../db/pool');
const adminRepository = require('../../repositories/adminRepository');
const { ApiError } = require('../../utils/ApiError');
const { DEFAULT_RANKS, MONTHLY_REWARD_THRESHOLDS, MATCH_PERCENTAGE, DIRECT_INCOME_PERCENTAGE, PV_TO_BV_RATIO } = require('../../config/constants');

const DEPOSIT_WALLET_SETTING_KEY = 'deposit_wallet_config';

function normalizeDepositWalletConfig(value = {}, meta = {}) {
  const config = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    asset: 'USDT',
    network: 'BEP20',
    walletAddress: String(config.walletAddress || '').trim(),
    qrImageUrl: String(config.qrImageUrl || '').trim(),
    isActive: Boolean(config.isActive),
    instructions: String(config.instructions || 'Send only USDT on the BEP20 network. Deposits are credited after admin verification.').trim(),
    updatedAt: meta.updatedAt || null,
    updatedBy: meta.updatedBy || null
  };
}

async function getSettings() {
  const rows = await adminRepository.getSettings(null);
  const map = new Map(rows.map((r) => [r.setting_key, r]));
  const storedRankMultipliers = map.get('rank_multipliers')?.setting_value;
  const storedRewardSlabs = map.get('reward_slabs')?.setting_value;
  const depositWalletRow = map.get(DEPOSIT_WALLET_SETTING_KEY);

  return {
    compensationSettings: map.get('compensation_settings')?.setting_value || {
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
      : MONTHLY_REWARD_THRESHOLDS,
    depositWalletConfig: normalizeDepositWalletConfig(depositWalletRow?.setting_value, {
      updatedAt: depositWalletRow?.updated_at || null,
      updatedBy: depositWalletRow?.updated_by || null
    })
  };
}

async function getDepositWalletSettings() {
  const rows = await adminRepository.getSettings(null);
  const row = rows.find((item) => item.setting_key === DEPOSIT_WALLET_SETTING_KEY);
  return normalizeDepositWalletConfig(row?.setting_value, {
    updatedAt: row?.updated_at || null,
    updatedBy: row?.updated_by || null
  });
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

async function updateDepositWalletSettings(adminUserId, adminRole, payload) {
  if (String(adminRole || '').toLowerCase() !== 'super_admin') {
    throw new ApiError(403, 'Super admin access required');
  }

  return withTransaction(async (client) => {
    const before = await getDepositWalletSettings();
    const merged = normalizeDepositWalletConfig({
      ...before,
      ...payload,
      asset: 'USDT',
      network: 'BEP20'
    });

    if (merged.isActive && !merged.walletAddress) {
      throw new ApiError(400, 'Wallet address is required when the deposit wallet is active');
    }

    const saved = await adminRepository.upsertSetting(client, DEPOSIT_WALLET_SETTING_KEY, {
      asset: 'USDT',
      network: 'BEP20',
      walletAddress: merged.walletAddress,
      qrImageUrl: merged.qrImageUrl,
      isActive: merged.isActive,
      instructions: merged.instructions
    }, adminUserId);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'deposit_wallet.update',
      targetEntity: 'app_settings',
      targetId: DEPOSIT_WALLET_SETTING_KEY,
      beforeData: before,
      afterData: saved,
      metadata: {
        walletAddress: merged.walletAddress,
        isActive: merged.isActive
      }
    });

    return normalizeDepositWalletConfig(saved.setting_value, {
      updatedAt: saved.updated_at,
      updatedBy: saved.updated_by
    });
  });
}

module.exports = {
  getSettings,
  updateSettings,
  getDepositWalletSettings,
  updateDepositWalletSettings,
  normalizeDepositWalletConfig,
  DEPOSIT_WALLET_SETTING_KEY
};
