function q(client) {
  return client || require('../db/pool').pool;
}

async function createRun(client, runDate, notes = null) {
  const { rows } = await q(client).query(
    `INSERT INTO matching_runs (run_date, notes)
     VALUES ($1, $2)
     RETURNING *`,
    [runDate, notes]
  );
  return rows[0];
}

async function createResult(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO matching_results (
      run_id,
      user_id,
      left_pv_before,
      right_pv_before,
      matched_pv,
      gross_income,
      cap_limit,
      net_income,
      flushed_left_pv,
      flushed_right_pv,
      carry_left_after,
      carry_right_after
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      payload.runId,
      payload.userId,
      payload.leftPvBefore,
      payload.rightPvBefore,
      payload.matchedPv,
      payload.grossIncome,
      payload.capLimit,
      payload.netIncome,
      payload.flushedLeftPv,
      payload.flushedRightPv,
      payload.carryLeftAfter,
      payload.carryRightAfter
    ]
  );
  return rows[0];
}

async function listRuns(client, limit = 20) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM matching_runs
     ORDER BY run_date DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getRunResults(client, runId) {
  const { rows } = await q(client).query(
    `SELECT mr.*, u.username, u.email
     FROM matching_results mr
     JOIN users u ON u.id = mr.user_id
     WHERE mr.run_id = $1
     ORDER BY mr.created_at ASC`,
    [runId]
  );
  return rows;
}

module.exports = {
  createRun,
  createResult,
  listRuns,
  getRunResults
};
