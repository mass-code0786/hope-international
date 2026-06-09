const { withTransaction } = require('../db/pool');
const autopoolService = require('../services/autopoolService');

const BONUS_EXPIRY_INTERVAL_MS = 15 * 60 * 1000;
const BONUS_EXPIRY_STATEMENT_TIMEOUT_MS = 30 * 1000;
const BONUS_EXPIRY_LOCK_TIMEOUT_MS = 2 * 1000;
let expiryTimer = null;
let expiryPassRunning = false;

async function runBonusExpiryPass(limit = 100) {
  return withTransaction(async (client) => {
    await client.query(`SET LOCAL statement_timeout = '${BONUS_EXPIRY_STATEMENT_TIMEOUT_MS}ms'`);
    await client.query(`SET LOCAL lock_timeout = '${BONUS_EXPIRY_LOCK_TIMEOUT_MS}ms'`);
    return autopoolService.expireAutopoolBonusCredits(client, { limit });
  });
}

async function runBonusExpirySafely() {
  if (expiryPassRunning) {
    console.warn('[autopool.bonus-expiry.skipped]', {
      reason: 'previous_pass_still_running'
    });
    return null;
  }

  expiryPassRunning = true;
  try {
    const result = await runBonusExpiryPass();
    if (Number(result?.expiredCount || 0) > 0) {
      console.log('[autopool.bonus-expiry]', result);
    }
    return result;
  } catch (error) {
    const walletContext = error.walletContext || {};
    console.warn('[autopool.bonus-expiry]', {
      userId: walletContext.userId || null,
      walletId: walletContext.walletId || null,
      queryLocation: walletContext.queryLocation || 'autopoolBonusExpiryProcessor.runBonusExpiryPass',
      code: error.code || null,
      message: error.message
    });
    return null;
  } finally {
    expiryPassRunning = false;
  }
}

function startAutopoolBonusExpiryProcessor() {
  if (expiryTimer) {
    return {
      started: true,
      intervalMs: BONUS_EXPIRY_INTERVAL_MS
    };
  }

  expiryTimer = setInterval(() => {
    void runBonusExpirySafely();
  }, BONUS_EXPIRY_INTERVAL_MS);

  if (typeof expiryTimer.unref === 'function') {
    expiryTimer.unref();
  }

  setImmediate(() => {
    void runBonusExpirySafely();
  });

  return {
    started: true,
    intervalMs: BONUS_EXPIRY_INTERVAL_MS
  };
}

module.exports = {
  BONUS_EXPIRY_INTERVAL_MS,
  BONUS_EXPIRY_STATEMENT_TIMEOUT_MS,
  BONUS_EXPIRY_LOCK_TIMEOUT_MS,
  runBonusExpiryPass,
  runBonusExpirySafely,
  startAutopoolBonusExpiryProcessor
};
