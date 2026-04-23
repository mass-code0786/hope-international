const fs = require('fs');
const path = require('path');
const { pool } = require('../db/pool');
const {
  analyzeBinaryTreeRepair,
  serializeRepairAnalysis
} = require('../services/binaryTreeRepairService');

const DEFAULT_REPORT_DIR = path.join(process.cwd(), 'storage', 'binary-tree-repair');
const AUDIT_LOG_CHUNK_SIZE = 250;
const UPDATE_CHUNK_SIZE = 200;
const LEDGER_INSERT_CHUNK_SIZE = 300;

function parseArgs(argv = []) {
  const options = {
    mode: 'dry_run',
    rebuildVolumes: false,
    refreshRanks: false,
    persistAudit: true,
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
      case '--rebuild-volumes':
        options.rebuildVolumes = true;
        break;
      case '--refresh-ranks':
        options.refreshRanks = true;
        break;
      case '--no-audit':
        options.persistAudit = false;
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

  if (options.refreshRanks && !options.rebuildVolumes) {
    throw new Error('--refresh-ranks requires --rebuild-volumes');
  }

  return options;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildTimestampToken() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function buildOutputPaths(options) {
  ensureDir(options.reportDir);
  const token = buildTimestampToken();
  return {
    reportPath: path.join(options.reportDir, `${token}-${options.mode}-report.json`),
    backupPath: path.join(options.reportDir, `${token}-${options.mode}-backup.json`)
  };
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

async function loadRepairDataset(client, { lockUsers = false } = {}) {
  const lockClause = lockUsers ? ' FOR UPDATE' : '';
  const usersResult = await client.query(
    `SELECT
       id,
       username,
       sponsor_id,
       parent_id,
       placement_side::text AS placement_side,
       left_child_id,
       right_child_id,
       self_pv,
       carry_left_pv,
       carry_right_pv,
       total_left_pv,
       total_right_pv,
       lifetime_bv,
       rank_id,
       created_at
     FROM users
     ORDER BY created_at ASC, id ASC${lockClause}`
  );

  const settledOrdersResult = await client.query(
    `SELECT
       o.id,
       o.user_id,
       o.settled_at,
       COALESCE(SUM(oi.pv * oi.quantity) FILTER (WHERE p.is_qualifying = true), 0)::numeric(14,2) AS qualifying_pv,
       COALESCE(SUM(oi.bv * oi.quantity) FILTER (WHERE p.is_qualifying = true), 0)::numeric(14,2) AS qualifying_bv
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE o.settlement_status = 'settled'
       AND o.settled_at IS NOT NULL
     GROUP BY o.id, o.user_id, o.settled_at
     ORDER BY o.settled_at ASC, o.id ASC`
  );

  const ledgerResult = await client.query(
    `SELECT
       ancestor_user_id,
       source_user_id,
       order_id,
       leg::text AS leg,
       pv,
       bv,
       created_at
     FROM binary_volume_ledger
     ORDER BY created_at ASC, id ASC`
  );

  const weeklyCyclesResult = await client.query(
    `SELECT id, cycle_start, cycle_end, closed_at
     FROM weekly_cycles
     ORDER BY cycle_start ASC, id ASC`
  );

  const monthlyCyclesResult = await client.query(
    `SELECT id, month_start, month_end
     FROM monthly_cycles
     ORDER BY month_start ASC, id ASC`
  );

  const ranksResult = await client.query(
    `SELECT id, name, min_bv
     FROM ranks
     WHERE is_active = true
     ORDER BY min_bv ASC, id ASC`
  );

  return {
    users: usersResult.rows,
    settledOrders: settledOrdersResult.rows,
    currentVolumeLedger: ledgerResult.rows,
    weeklyCycles: weeklyCyclesResult.rows,
    monthlyCycles: monthlyCyclesResult.rows,
    ranks: ranksResult.rows
  };
}

function buildAuditSummary(analysis, options) {
  return {
    mode: options.mode,
    rebuildVolumes: Boolean(options.rebuildVolumes),
    refreshRanks: Boolean(options.refreshRanks),
    note: options.note || null,
    ...analysis.summary,
    compensation: {
      recalcRequired: analysis.compensation.recalcRequired,
      blocked: Boolean(analysis.compensation.blocked),
      changedLedgerEntryCount: analysis.compensation.changedLedgerEntryCount,
      changedOrderCount: analysis.compensation.changedOrderCount,
      impactedAncestorCount: analysis.compensation.impactedAncestorCount,
      changedUserVolumeCount: analysis.compensation.changedUserVolumeCount,
      rankChangeCount: analysis.compensation.rankChangeCount,
      impactedWeeklyCycleIds: analysis.compensation.impactedWeeklyCycleIds,
      impactedMonthlyCycleIds: analysis.compensation.impactedMonthlyCycleIds
    }
  };
}

async function createAuditRun(client, { status, options, summary, reportPath, backupPath }) {
  const { rows } = await client.query(
    `INSERT INTO binary_tree_repair_runs (
       mode,
       status,
       options,
       summary,
       report_path,
       backup_path,
       notes,
       completed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id`,
    [
      options.mode,
      status,
      {
        rebuildVolumes: Boolean(options.rebuildVolumes),
        refreshRanks: Boolean(options.refreshRanks),
        persistAudit: Boolean(options.persistAudit)
      },
      summary,
      reportPath || null,
      backupPath || null,
      options.note || null
    ]
  );

  return rows[0]?.id || null;
}

async function insertAuditLogs(client, runId, logs = []) {
  if (!runId || !logs.length) return;

  for (let offset = 0; offset < logs.length; offset += AUDIT_LOG_CHUNK_SIZE) {
    const chunk = logs.slice(offset, offset + AUDIT_LOG_CHUNK_SIZE);
    const values = [];
    const placeholders = [];

    for (const log of chunk) {
      const base = values.length;
      values.push(
        runId,
        log.userId,
        log.sponsorId || null,
        log.intendedLeg || null,
        log.currentParentId || null,
        log.currentPlacementSide || null,
        log.correctedParentId || null,
        log.correctedPlacementSide || null,
        Boolean(log.moveRequired),
        Boolean(log.directViolation),
        log.violationType,
        log.reason,
        log.details || {}
      );
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::placement_side, $${base + 5}, $${base + 6}::placement_side, $${base + 7}, $${base + 8}::placement_side, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13})`
      );
    }

    await client.query(
      `INSERT INTO binary_tree_repair_logs (
         run_id,
         user_id,
         sponsor_id,
         intended_leg,
         current_parent_id,
         current_placement_side,
         corrected_parent_id,
         corrected_placement_side,
         move_required,
         direct_violation,
         violation_type,
         reason,
         details
       )
       VALUES ${placeholders.join(', ')}`,
      values
    );
  }
}

function buildUsersToRewrite(analysis) {
  const usersToRewrite = [];

  for (const current of analysis.users) {
    const corrected = analysis.correctedById.get(current.id);
    if (!corrected) continue;

    const changed = (
      (current.parent_id || null) !== (corrected.parent_id || null)
      || (current.placement_side || null) !== (corrected.placement_side || null)
      || (current.left_child_id || null) !== (corrected.left_child_id || null)
      || (current.right_child_id || null) !== (corrected.right_child_id || null)
    );

    if (!changed) continue;

    usersToRewrite.push({
      id: current.id,
      parentId: corrected.parent_id || null,
      placementSide: corrected.placement_side || null,
      leftChildId: corrected.left_child_id || null,
      rightChildId: corrected.right_child_id || null
    });
  }

  return usersToRewrite;
}

async function applyTreeUpdates(client, usersToRewrite = []) {
  if (!usersToRewrite.length) return 0;

  for (let offset = 0; offset < usersToRewrite.length; offset += UPDATE_CHUNK_SIZE) {
    const chunk = usersToRewrite.slice(offset, offset + UPDATE_CHUNK_SIZE);
    const values = [];
    const tuples = [];

    for (const user of chunk) {
      const base = values.length;
      values.push(
        user.id,
        user.parentId || null,
        user.placementSide || null,
        user.leftChildId || null,
        user.rightChildId || null
      );
      tuples.push(`($${base + 1}::uuid, $${base + 2}::uuid, $${base + 3}::text, $${base + 4}::uuid, $${base + 5}::uuid)`);
    }

    await client.query(
      `UPDATE users AS target
       SET parent_id = source.parent_id,
           placement_side = source.placement_side::placement_side,
           left_child_id = source.left_child_id,
           right_child_id = source.right_child_id
       FROM (
         VALUES ${tuples.join(', ')}
       ) AS source(id, parent_id, placement_side, left_child_id, right_child_id)
       WHERE target.id = source.id`,
      values
    );
  }

  return usersToRewrite.length;
}

async function rebuildVolumeLedger(client, analysis) {
  await client.query('DELETE FROM binary_volume_ledger');
  await client.query(
    `UPDATE users
     SET self_pv = 0,
         carry_left_pv = 0,
         carry_right_pv = 0,
         total_left_pv = 0,
         total_right_pv = 0,
         lifetime_bv = 0`
  );

  const ledgerEntries = analysis.correctedVolumePlan.correctedLedgerEntries || [];
  for (let offset = 0; offset < ledgerEntries.length; offset += LEDGER_INSERT_CHUNK_SIZE) {
    const chunk = ledgerEntries.slice(offset, offset + LEDGER_INSERT_CHUNK_SIZE);
    const values = [];
    const placeholders = [];

    for (const entry of chunk) {
      const base = values.length;
      values.push(
        entry.ancestor_user_id,
        entry.source_user_id,
        entry.order_id,
        entry.leg,
        entry.pv,
        entry.bv,
        entry.created_at
      );
      placeholders.push(
        `($${base + 1}::uuid, $${base + 2}::uuid, $${base + 3}::uuid, $${base + 4}::placement_side, $${base + 5}, $${base + 6}, $${base + 7}::timestamptz)`
      );
    }

    await client.query(
      `INSERT INTO binary_volume_ledger (
         ancestor_user_id,
         source_user_id,
         order_id,
         leg,
         pv,
         bv,
         created_at
       )
       VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  const userVolumes = [...analysis.correctedVolumePlan.userVolumes.values()];
  for (let offset = 0; offset < userVolumes.length; offset += UPDATE_CHUNK_SIZE) {
    const chunk = userVolumes.slice(offset, offset + UPDATE_CHUNK_SIZE);
    const values = [];
    const tuples = [];

    for (const volume of chunk) {
      const base = values.length;
      values.push(
        volume.userId,
        volume.selfPv,
        volume.carryLeftPv,
        volume.carryRightPv,
        volume.totalLeftPv,
        volume.totalRightPv,
        volume.lifetimeBv
      );
      tuples.push(`($${base + 1}::uuid, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
    }

    await client.query(
      `UPDATE users AS target
       SET self_pv = source.self_pv,
           carry_left_pv = source.carry_left_pv,
           carry_right_pv = source.carry_right_pv,
           total_left_pv = source.total_left_pv,
           total_right_pv = source.total_right_pv,
           lifetime_bv = source.lifetime_bv
       FROM (
         VALUES ${tuples.join(', ')}
       ) AS source(user_id, self_pv, carry_left_pv, carry_right_pv, total_left_pv, total_right_pv, lifetime_bv)
       WHERE target.id = source.user_id`,
      values
    );
  }

  return {
    rebuiltLedgerEntries: ledgerEntries.length,
    rebuiltUserVolumes: userVolumes.length
  };
}

async function refreshRanks(client, analysis) {
  const rankUpdates = [...analysis.correctedVolumePlan.userVolumes.values()]
    .filter((volume) => volume.suggestedRankId != null)
    .map((volume) => ({
      userId: volume.userId,
      rankId: volume.suggestedRankId
    }));

  if (!rankUpdates.length) return 0;

  for (let offset = 0; offset < rankUpdates.length; offset += UPDATE_CHUNK_SIZE) {
    const chunk = rankUpdates.slice(offset, offset + UPDATE_CHUNK_SIZE);
    const values = [];
    const tuples = [];

    for (const update of chunk) {
      const base = values.length;
      values.push(update.userId, update.rankId);
      tuples.push(`($${base + 1}::uuid, $${base + 2}::int)`);
    }

    await client.query(
      `UPDATE users AS target
       SET rank_id = source.rank_id
       FROM (
         VALUES ${tuples.join(', ')}
       ) AS source(user_id, rank_id)
       WHERE target.id = source.user_id`,
      values
    );
  }

  return rankUpdates.length;
}

function printSummary(analysis, options, reportPath, backupPath = null) {
  const lines = [
    `Mode: ${options.mode}`,
    `Users analyzed: ${analysis.summary.totalUsers}`,
    `Sponsored users: ${analysis.summary.sponsoredUsers}`,
    `Users requiring rewrite: ${analysis.summary.totalUsersToRewrite}`,
    `Direct same-leg violations: ${analysis.summary.directSameLegViolations}`,
    `Indirectly displaced users: ${analysis.summary.displacedUsers}`,
    `Unresolved users: ${analysis.summary.unresolvedUsers}`,
    `Current orphaned users: ${analysis.summary.currentIntegrity.orphanedUsers}`,
    `Corrected orphaned users: ${analysis.summary.correctedIntegrity.orphanedUsers}`,
    `Current same-leg violations: ${analysis.summary.currentIntegrity.sameLegViolations}`,
    `Corrected same-leg violations: ${analysis.summary.correctedIntegrity.sameLegViolations}`,
    `Compensation recalculation required: ${analysis.compensation.recalcRequired === null ? 'unknown' : String(analysis.compensation.recalcRequired)}`,
    `Report: ${reportPath}`
  ];

  if (backupPath) {
    lines.push(`Backup: ${backupPath}`);
  }

  for (const example of analysis.examples) {
    lines.push(`Example ${example.username || example.userId}: ${example.currentPath} => ${example.correctedPath}`);
  }

  console.log(lines.join('\n'));
}

async function persistAuditIfNeeded(client, options, analysis, status, reportPath, backupPath = null) {
  if (!options.persistAudit) return null;
  const runId = await createAuditRun(client, {
    status,
    options,
    summary: buildAuditSummary(analysis, options),
    reportPath,
    backupPath
  });
  await insertAuditLogs(client, runId, analysis.auditLogs);
  return runId;
}

async function runDryRun(options) {
  const outputPaths = buildOutputPaths(options);
  const dataset = await loadRepairDataset(pool, { lockUsers: false });
  const analysis = analyzeBinaryTreeRepair(dataset);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    options,
    ...serializeRepairAnalysis(analysis)
  };

  writeJson(outputPaths.reportPath, report);
  await persistAuditIfNeeded(pool, options, analysis, 'analyzed', outputPaths.reportPath);
  printSummary(analysis, options, outputPaths.reportPath);
}

async function runApply(options) {
  const outputPaths = buildOutputPaths(options);
  const client = await pool.connect();
  let analysis = null;
  let report = null;
  let backup = null;
  let transactionOpen = false;
  let terminalAuditPersisted = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const dataset = await loadRepairDataset(client, { lockUsers: true });
    analysis = analyzeBinaryTreeRepair(dataset);
    report = {
      generatedAt: new Date().toISOString(),
      mode: options.mode,
      options,
      ...serializeRepairAnalysis(analysis)
    };
    backup = {
      generatedAt: new Date().toISOString(),
      mode: 'pre_apply_backup',
      options,
      users: analysis.users,
      currentVolumeLedger: analysis.currentVolumeLedger,
      settledOrders: analysis.settledOrders
    };

    writeJson(outputPaths.reportPath, report);
    writeJson(outputPaths.backupPath, backup);

    if (analysis.summary.unresolvedUsers > 0) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      try {
        await persistAuditIfNeeded(pool, options, analysis, 'blocked', outputPaths.reportPath, outputPaths.backupPath);
        terminalAuditPersisted = true;
      } catch (auditError) {
        console.warn('Failed to persist blocked repair audit:', auditError.message);
      }
      printSummary(analysis, options, outputPaths.reportPath, outputPaths.backupPath);
      throw new Error('Binary tree repair blocked because unresolved users remain in the analysis report');
    }

    const usersToRewrite = buildUsersToRewrite(analysis);
    const rewrittenUsers = await applyTreeUpdates(client, usersToRewrite);

    let volumeRebuildSummary = null;
    let refreshedRanks = 0;
    if (options.rebuildVolumes) {
      volumeRebuildSummary = await rebuildVolumeLedger(client, analysis);
      if (options.refreshRanks) {
        refreshedRanks = await refreshRanks(client, analysis);
      }
    }

    const appliedReport = {
      ...report,
      applyResult: {
        rewrittenUsers,
        rebuildVolumes: Boolean(options.rebuildVolumes),
        refreshedRanks,
        volumeRebuildSummary
      }
    };

    writeJson(outputPaths.reportPath, appliedReport);
    await client.query('COMMIT');
    transactionOpen = false;

    try {
      await persistAuditIfNeeded(pool, options, analysis, 'applied', outputPaths.reportPath, outputPaths.backupPath);
      terminalAuditPersisted = true;
    } catch (auditError) {
      console.warn('Failed to persist applied repair audit:', auditError.message);
    }

    printSummary(analysis, options, outputPaths.reportPath, outputPaths.backupPath);
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (_rollbackError) {
        // Ignore rollback failures to preserve the original error.
      }
    }

    if (analysis && options.persistAudit && !terminalAuditPersisted) {
      try {
        await persistAuditIfNeeded(pool, options, analysis, 'failed', outputPaths.reportPath, outputPaths.backupPath);
        terminalAuditPersisted = true;
      } catch (auditError) {
        console.warn('Failed to persist failed repair audit:', auditError.message);
      }
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
