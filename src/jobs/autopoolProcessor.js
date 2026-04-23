const { withTransaction } = require('../db/pool');
const autopoolRepository = require('../repositories/autopoolRepository');

function shouldRebuildQueue(snapshot = {}) {
  return Boolean(
    Number(snapshot.missingQueueEntries || 0) > 0
    || Number(snapshot.invalidQueueEntries || 0) > 0
    || Number(snapshot.activeEntryCount || 0) !== Number(snapshot.queuedEntryCount || 0)
  );
}

async function ensureQueueHealth(client, options = {}) {
  const before = await autopoolRepository.getQueueHealth(client);
  const needsRebuild = options.force === true || shouldRebuildQueue(before);

  if (!needsRebuild) {
    return {
      repaired: false,
      before,
      after: before
    };
  }

  const after = await autopoolRepository.rebuildQueue(client);
  return {
    repaired: true,
    before,
    after
  };
}

async function rebuildQueue(client) {
  return autopoolRepository.rebuildQueue(client);
}

async function bootstrapAutopoolQueue() {
  return withTransaction(async (client) => {
    await autopoolRepository.acquireGlobalQueueLock(client);
    return ensureQueueHealth(client);
  });
}

module.exports = {
  ensureQueueHealth,
  rebuildQueue,
  bootstrapAutopoolQueue
};
