const { withTransaction } = require('../db/pool');
const autopoolService = require('../services/autopoolService');

const BONUS_EXPIRY_INTERVAL_MS = 15 * 60 * 1000;
let expiryTimer = null;

async function runBonusExpiryPass(limit = 100) {
  return withTransaction((client) => autopoolService.expireAutopoolBonusCredits(client, { limit }));
}

function startAutopoolBonusExpiryProcessor() {
  if (expiryTimer) {
    return {
      started: true,
      intervalMs: BONUS_EXPIRY_INTERVAL_MS
    };
  }

  const tick = async () => {
    try {
      const result = await runBonusExpiryPass();
      if (Number(result?.expiredCount || 0) > 0) {
        console.log('[autopool.bonus-expiry]', result);
      }
    } catch (error) {
      console.warn('[autopool.bonus-expiry]', {
        message: error.message
      });
    }
  };

  expiryTimer = setInterval(() => {
    tick();
  }, BONUS_EXPIRY_INTERVAL_MS);

  if (typeof expiryTimer.unref === 'function') {
    expiryTimer.unref();
  }

  tick();

  return {
    started: true,
    intervalMs: BONUS_EXPIRY_INTERVAL_MS
  };
}

module.exports = {
  BONUS_EXPIRY_INTERVAL_MS,
  runBonusExpiryPass,
  startAutopoolBonusExpiryProcessor
};
