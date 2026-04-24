const fs = require('fs');
const path = require('path');
const { pool } = require('../db/pool');
const walletRepository = require('../repositories/walletRepository');
const autopoolRepository = require('../repositories/autopoolRepository');
const userRepository = require('../repositories/userRepository');
const walletService = require('../services/walletService');

const DEFAULT_REPORT_DIR = path.join(process.cwd(), 'storage', 'autopool-sponsor-income-repair');
const SPONSOR_WALLET_SOURCES = ['sponsor_pool_income', 'autopool_upline_income'];

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizePackageAmount(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? toMoney(parsed) : toMoney(fallback);
}

function parseArgs(argv = []) {
  const options = {
    mode: 'dry_run',
    reportDir: DEFAULT_REPORT_DIR,
    note: ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--dry-run':
        options.mode = 'dry_run';
        break;
      case '--apply':
        options.mode = 'apply';
        break;
      case '--report-dir':
        index += 1;
        options.reportDir = path.resolve(process.cwd(), argv[index] || DEFAULT_REPORT_DIR);
        break;
      case '--note':
        index += 1;
        options.note = String(argv[index] || '').trim();
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildTimestampToken() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function buildOutputPath(options) {
  ensureDir(options.reportDir);
  return path.join(options.reportDir, `${buildTimestampToken()}-${options.mode}-report.json`);
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function buildRunId() {
  return `autopool-sponsor-income-repair:${buildTimestampToken()}`;
}

function buildRepairEventKey(packageAmount, entryId, sponsorUserId) {
  const normalizedAmount = normalizePackageAmount(packageAmount).toString().replace('.', '_');
  return `autopool:repair:sponsor:${normalizedAmount}:${entryId}:${sponsorUserId}`;
}

function classifyInvalidReasons(row) {
  const reasons = [];
  const receiverUserId = String(row.receiver_user_id || '');
  const matrixOwnerUserId = String(row.matrix_owner_user_id || '');
  const expectedSponsorUserId = String(row.direct_sponsor_user_id || '');

  if (!matrixOwnerUserId) {
    reasons.push('missing_matrix_owner');
  }
  if (!expectedSponsorUserId) {
    reasons.push('missing_direct_sponsor');
  }
  if (receiverUserId && matrixOwnerUserId && receiverUserId === matrixOwnerUserId) {
    reasons.push('self_receiver');
  }
  if (receiverUserId && expectedSponsorUserId && receiverUserId !== expectedSponsorUserId) {
    reasons.push('receiver_not_direct_sponsor');
  }

  return reasons;
}

async function listInvalidSponsorIncomeRows(client) {
  const { rows } = await client.query(
    `WITH sponsor_income_rows AS (
       SELECT
         at.id AS autopool_transaction_id,
         at.user_id AS receiver_user_id,
         at.entry_id,
         at.amount,
         at.package_amount,
         at.source_user_id,
         at.wallet_transaction_id,
         at.event_key,
         at.metadata AS autopool_metadata,
         at.created_at AS autopool_created_at,
         wt.id AS linked_wallet_transaction_id,
         wt.metadata AS wallet_metadata,
         wt.created_at AS wallet_created_at,
         ae.user_id AS entry_owner_user_id,
         ae.cycle_number,
         ae.recycle_count,
         receiver.username AS receiver_username,
         receiver.first_name AS receiver_first_name,
         receiver.last_name AS receiver_last_name,
         matrix_owner.id AS matrix_owner_user_id,
         matrix_owner.username AS matrix_owner_username,
         matrix_owner.first_name AS matrix_owner_first_name,
         matrix_owner.last_name AS matrix_owner_last_name,
         direct_sponsor.id AS direct_sponsor_user_id,
         direct_sponsor.username AS direct_sponsor_username,
         direct_sponsor.first_name AS direct_sponsor_first_name,
         direct_sponsor.last_name AS direct_sponsor_last_name,
         COALESCE(
           at.source_user_id::text,
           ae.user_id::text,
           NULLIF(at.metadata->>'sourceOwnerId', ''),
           NULLIF(at.metadata->>'matrixOwnerUserId', '')
         ) AS matrix_owner_user_id_text,
         COALESCE(
           NULLIF(at.metadata->>'sponsorUserId', ''),
           matrix_owner.sponsor_id::text
         ) AS expected_sponsor_user_id_text,
         COALESCE(
           at.metadata->'sponsorIncomeCleanup'->>'status',
           wt.metadata->'sponsorIncomeCleanup'->>'status'
         ) AS cleanup_status
       FROM autopool_transactions at
       JOIN wallet_transactions wt ON wt.id = at.wallet_transaction_id
       LEFT JOIN autopool_entries ae ON ae.id = at.entry_id
       LEFT JOIN users receiver ON receiver.id = at.user_id
       LEFT JOIN users matrix_owner
         ON matrix_owner.id::text = COALESCE(
           at.source_user_id::text,
           ae.user_id::text,
           NULLIF(at.metadata->>'sourceOwnerId', ''),
           NULLIF(at.metadata->>'matrixOwnerUserId', '')
         )
       LEFT JOIN users direct_sponsor
         ON direct_sponsor.id::text = COALESCE(
           NULLIF(at.metadata->>'sponsorUserId', ''),
           matrix_owner.sponsor_id::text
         )
       WHERE wt.source::text = ANY($1::text[])
         AND wt.tx_type = 'credit'
     )
     SELECT *
     FROM sponsor_income_rows
     WHERE cleanup_status IS NULL
       AND (
         matrix_owner_user_id_text IS NULL
         OR expected_sponsor_user_id_text IS NULL
         OR receiver_user_id::text = matrix_owner_user_id_text
         OR receiver_user_id::text <> expected_sponsor_user_id_text
       )
     ORDER BY autopool_created_at ASC, autopool_transaction_id ASC`,
    [SPONSOR_WALLET_SOURCES]
  );

  return rows.map((row) => ({
    ...row,
    amount: toMoney(row.amount),
    package_amount: normalizePackageAmount(row.package_amount, 0),
    cycle_number: row.cycle_number === null || row.cycle_number === undefined ? null : Number(row.cycle_number),
    recycle_count: row.recycle_count === null || row.recycle_count === undefined ? null : Number(row.recycle_count),
    invalid_reasons: classifyInvalidReasons(row)
  }));
}

async function appendCleanupMetadata(client, tableName, id, payload) {
  const { rows } = await client.query(
    `UPDATE ${tableName}
     SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
     WHERE id = $1
     RETURNING metadata`,
    [id, JSON.stringify(payload)]
  );
  return rows[0]?.metadata || null;
}

async function createCleanupAdminAction(client, adminUserId, targetUserId, actionType, amount, reason, metadata) {
  if (!adminUserId) return null;

  return walletRepository.createAdminWalletAction(client, {
    adminUserId,
    targetUserId,
    walletType: 'income_wallet',
    actionType,
    amount,
    reason,
    metadata
  });
}

async function reverseInvalidSponsorCredit(client, adminUserId, row, runId, note) {
  await walletRepository.createWallet(client, row.receiver_user_id);
  const wallet = await walletRepository.getWalletForUpdate(client, row.receiver_user_id);
  const currentIncomeBalance = toMoney(wallet?.income_balance || 0);

  if (currentIncomeBalance < row.amount) {
    return {
      applied: false,
      reason: 'insufficient_income_balance',
      currentIncomeBalance
    };
  }

  const adjustedWallet = await walletRepository.adjustWalletBalance(
    client,
    row.receiver_user_id,
    'income_wallet',
    row.amount * -1
  );

  const reversalTransaction = await walletRepository.createTransaction(client, {
    userId: row.receiver_user_id,
    txType: 'debit',
    source: 'manual_adjustment',
    amount: row.amount,
    referenceId: row.linked_wallet_transaction_id,
    metadata: {
      note: note || 'Sponsor pool income cleanup reversal',
      walletType: 'income_wallet',
      cleanupKind: 'autopool_sponsor_income_reversal',
      cleanupRunId: runId,
      autopoolTransactionId: row.autopool_transaction_id,
      originalWalletTransactionId: row.linked_wallet_transaction_id,
      entryId: row.entry_id,
      matrixOwnerUserId: row.matrix_owner_user_id,
      expectedSponsorUserId: row.direct_sponsor_user_id,
      invalidReasons: row.invalid_reasons
    },
    createdByAdminId: adminUserId || null
  });

  await createCleanupAdminAction(
    client,
    adminUserId,
    row.receiver_user_id,
    'sponsor_pool_cleanup_reversal',
    row.amount,
    note || 'Sponsor pool income cleanup reversal',
    {
      cleanupRunId: runId,
      autopoolTransactionId: row.autopool_transaction_id,
      originalWalletTransactionId: row.linked_wallet_transaction_id,
      entryId: row.entry_id,
      invalidReasons: row.invalid_reasons
    }
  );

  return {
    applied: true,
    wallet: adjustedWallet,
    transaction: reversalTransaction
  };
}

async function ensureCorrectSponsorCredit(client, adminUserId, row, runId, note) {
  const matrixOwnerUserId = row.matrix_owner_user_id || row.source_user_id || row.entry_owner_user_id || null;
  const sponsorUserId = row.direct_sponsor_user_id || null;

  if (!matrixOwnerUserId) {
    return {
      applied: false,
      reason: 'missing_matrix_owner'
    };
  }

  if (!row.entry_id) {
    return {
      applied: false,
      reason: 'missing_entry_id'
    };
  }

  if (!sponsorUserId) {
    return {
      applied: false,
      reason: 'missing_direct_sponsor'
    };
  }

  if (String(sponsorUserId) === String(matrixOwnerUserId)) {
    return {
      applied: false,
      reason: 'self_sponsor_guard'
    };
  }

  let walletTransaction = await walletRepository.getTransactionBySourceAndReference(
    client,
    sponsorUserId,
    'sponsor_pool_income',
    row.entry_id
  );
  let createdWalletTransaction = false;

  if (!walletTransaction) {
    const credited = await walletService.creditWithTransaction(
      client,
      sponsorUserId,
      row.amount,
      'sponsor_pool_income',
      row.entry_id,
      {
        walletType: 'earning_wallet',
        packageAmount: row.package_amount,
        entryId: row.entry_id,
        cycleNumber: Number(row.cycle_number || 0),
        sourceUserId: matrixOwnerUserId,
        sourceEntryId: row.entry_id,
        sourceOwnerId: matrixOwnerUserId,
        matrixOwnerUserId,
        sponsorUserId,
        sponsorRelationship: 'direct_referral',
        repairedFromAutopoolTransactionId: row.autopool_transaction_id,
        repairedFromWalletTransactionId: row.linked_wallet_transaction_id,
        sponsorIncomeRepairRunId: runId,
        note: note || 'Sponsor pool income cleanup corrective credit'
      },
      adminUserId || null
    );

    walletTransaction = credited.transaction;
    createdWalletTransaction = true;

    await createCleanupAdminAction(
      client,
      adminUserId,
      sponsorUserId,
      'sponsor_pool_cleanup_credit',
      row.amount,
      note || 'Sponsor pool income cleanup corrective credit',
      {
        cleanupRunId: runId,
        entryId: row.entry_id,
        matrixOwnerUserId,
        repairedFromAutopoolTransactionId: row.autopool_transaction_id,
        repairedFromWalletTransactionId: row.linked_wallet_transaction_id
      }
    );
  }

  const repairEventKey = buildRepairEventKey(row.package_amount, row.entry_id, sponsorUserId);
  let autopoolTransaction = await autopoolRepository.getTransactionByEventKey(client, repairEventKey);
  let createdAutopoolTransaction = false;

  if (!autopoolTransaction) {
    autopoolTransaction = await autopoolRepository.createTransaction(client, {
      userId: sponsorUserId,
      entryId: row.entry_id,
      type: 'UPLINE',
      amount: row.amount,
      packageAmount: row.package_amount,
      sourceUserId: matrixOwnerUserId,
      walletTransactionId: walletTransaction?.id || null,
      eventKey: repairEventKey,
      metadata: {
        source: 'autopool',
        walletType: 'earning_wallet',
        walletSource: 'sponsor_pool_income',
        packageAmount: row.package_amount,
        entryId: row.entry_id,
        cycleNumber: Number(row.cycle_number || 0),
        sourceEntryId: row.entry_id,
        sourceOwnerId: matrixOwnerUserId,
        matrixOwnerUserId,
        sponsorUserId,
        sponsorRelationship: 'direct_referral',
        repairedFromAutopoolTransactionId: row.autopool_transaction_id,
        repairedFromWalletTransactionId: row.linked_wallet_transaction_id,
        sponsorIncomeRepairRunId: runId
      }
    });
    createdAutopoolTransaction = true;
  }

  return {
    applied: createdWalletTransaction || createdAutopoolTransaction,
    walletTransaction,
    autopoolTransaction,
    createdWalletTransaction,
    createdAutopoolTransaction
  };
}

async function processInvalidRow(client, adminUserId, row, runId, note) {
  const reversal = await reverseInvalidSponsorCredit(client, adminUserId, row, runId, note);
  if (!reversal.applied) {
    return {
      autopoolTransactionId: row.autopool_transaction_id,
      walletTransactionId: row.linked_wallet_transaction_id,
      entryId: row.entry_id,
      receiverUserId: row.receiver_user_id,
      receiverUsername: row.receiver_username || null,
      matrixOwnerUserId: row.matrix_owner_user_id || null,
      matrixOwnerUsername: row.matrix_owner_username || null,
      directSponsorUserId: row.direct_sponsor_user_id || null,
      directSponsorUsername: row.direct_sponsor_username || null,
      amount: row.amount,
      packageAmount: row.package_amount,
      invalidReasons: row.invalid_reasons,
      status: 'blocked',
      blockedReason: reversal.reason,
      currentIncomeBalance: reversal.currentIncomeBalance ?? null
    };
  }

  const correction = await ensureCorrectSponsorCredit(client, adminUserId, row, runId, note);
  const cleanupStatus = correction.applied ? 'reversed_and_recredited' : 'reversed';
  const cleanupMetadata = {
    sponsorIncomeCleanup: {
      runId,
      appliedAt: new Date().toISOString(),
      status: cleanupStatus,
      note: note || null,
      invalidReasons: row.invalid_reasons,
      reversalWalletTransactionId: reversal.transaction?.id || null,
      correctedWalletTransactionId: correction.walletTransaction?.id || null,
      correctedAutopoolTransactionId: correction.autopoolTransaction?.id || null,
      correctedSponsorUserId: row.direct_sponsor_user_id || null,
      correctionStatus: correction.reason || (correction.applied ? 'created_or_confirmed' : 'not_required_or_unavailable')
    }
  };

  await appendCleanupMetadata(client, 'autopool_transactions', row.autopool_transaction_id, cleanupMetadata);
  await appendCleanupMetadata(client, 'wallet_transactions', row.linked_wallet_transaction_id, cleanupMetadata);

  return {
    autopoolTransactionId: row.autopool_transaction_id,
    walletTransactionId: row.linked_wallet_transaction_id,
    entryId: row.entry_id,
    receiverUserId: row.receiver_user_id,
    receiverUsername: row.receiver_username || null,
    matrixOwnerUserId: row.matrix_owner_user_id || null,
    matrixOwnerUsername: row.matrix_owner_username || null,
    directSponsorUserId: row.direct_sponsor_user_id || null,
    directSponsorUsername: row.direct_sponsor_username || null,
    amount: row.amount,
    packageAmount: row.package_amount,
    invalidReasons: row.invalid_reasons,
    status: cleanupStatus,
    reversalWalletTransactionId: reversal.transaction?.id || null,
    correctedWalletTransactionId: correction.walletTransaction?.id || null,
    correctedAutopoolTransactionId: correction.autopoolTransaction?.id || null,
    correctedWalletTransactionCreated: Boolean(correction.createdWalletTransaction),
    correctedAutopoolTransactionCreated: Boolean(correction.createdAutopoolTransaction),
    correctionStatus: correction.reason || (correction.applied ? 'created_or_confirmed' : 'not_required_or_unavailable')
  };
}

function buildSummary(rows, processedRows = []) {
  const summary = {
    invalidRecordCount: rows.length,
    selfReceiverCount: rows.filter((row) => row.invalid_reasons.includes('self_receiver')).length,
    missingDirectSponsorCount: rows.filter((row) => row.invalid_reasons.includes('missing_direct_sponsor')).length,
    wrongReceiverCount: rows.filter((row) => row.invalid_reasons.includes('receiver_not_direct_sponsor')).length,
    blockedCount: processedRows.filter((row) => row.status === 'blocked').length,
    reversedCount: processedRows.filter((row) => ['reversed', 'reversed_and_recredited'].includes(row.status)).length,
    correctedCreditCount: processedRows.filter((row) => row.status === 'reversed_and_recredited').length
  };

  return summary;
}

async function runDryRun(options) {
  const reportPath = buildOutputPath(options);
  const rows = await listInvalidSponsorIncomeRows(pool);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    note: options.note || null,
    summary: buildSummary(rows),
    rows
  };

  writeJson(reportPath, report);
  console.log(`Dry run complete. Invalid sponsor income records: ${rows.length}`);
  console.log(`Report: ${reportPath}`);
}

async function runApply(options) {
  const reportPath = buildOutputPath(options);
  const client = await pool.connect();
  const runId = buildRunId();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [2048, 1338]);

    const adminUser = await userRepository.findAdminUser(client);
    const rows = await listInvalidSponsorIncomeRows(client);
    const processedRows = [];

    for (const row of rows) {
      const processed = await processInvalidRow(client, adminUser?.id || null, row, runId, options.note);
      processedRows.push(processed);
    }

    await client.query('COMMIT');

    const report = {
      generatedAt: new Date().toISOString(),
      mode: options.mode,
      runId,
      adminUserId: adminUser?.id || null,
      note: options.note || null,
      summary: buildSummary(rows, processedRows),
      rows: processedRows
    };

    writeJson(reportPath, report);
    console.log(`Apply complete. Processed invalid sponsor income records: ${rows.length}`);
    console.log(`Report: ${reportPath}`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_rollbackError) {
      // Preserve the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mode === 'apply') {
    await runApply(options);
    return;
  }

  await runDryRun(options);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
