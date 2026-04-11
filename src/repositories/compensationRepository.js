function q(client) {
  return client || require('../db/pool').pool;
}

async function createWeeklyCycle(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO weekly_cycles (cycle_start, cycle_end, notes)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [payload.cycleStart, payload.cycleEnd, payload.notes || null]
  );
  return rows[0];
}

async function listWeeklyCycles(client, limit = 20) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM weekly_cycles
     ORDER BY cycle_start DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getWeeklyCycle(client, cycleId) {
  const { rows } = await q(client).query('SELECT * FROM weekly_cycles WHERE id = $1', [cycleId]);
  return rows[0] || null;
}

async function aggregateUserQualifyingVolumes(client, userId, cycleStart, cycleEnd) {
  const { rows } = await q(client).query(
    `SELECT
       COALESCE(SUM(oi.pv * oi.quantity), 0)::numeric(14,2) AS total_pv,
       COALESCE(SUM(oi.bv * oi.quantity), 0)::numeric(14,2) AS total_bv
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN products p ON p.id = oi.product_id
     WHERE o.user_id = $1
       AND o.status = 'paid'
       AND o.settlement_status = 'settled'
       AND p.is_qualifying = true
       AND o.settled_at >= $2::date
       AND o.settled_at < ($3::date + INTERVAL '1 day')`,
    [userId, cycleStart, cycleEnd]
  );
  return rows[0];
}

async function aggregateUserDirectIncome(client, userId, cycleStart, cycleEnd) {
  const { rows } = await q(client).query(
    `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total_direct_income
     FROM wallet_transactions
     WHERE user_id = $1
       AND tx_type = 'credit'
       AND source = 'direct_income'
       AND created_at >= $2::date
       AND created_at < ($3::date + INTERVAL '1 day')`,
    [userId, cycleStart, cycleEnd]
  );
  return Number(rows[0]?.total_direct_income || 0);
}

async function createWeeklyUserSummary(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO weekly_user_summaries (
      cycle_id,
      user_id,
      rank_id,
      self_pv,
      left_pv,
      right_pv,
      matched_pv,
      matching_income_gross,
      cap_multiplier,
      cap_limit,
      matching_income_net,
      capped_overflow,
      flushed_left_pv,
      flushed_right_pv,
      direct_income
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      payload.cycleId,
      payload.userId,
      payload.rankId,
      payload.selfPv,
      payload.leftPv,
      payload.rightPv,
      payload.matchedPv,
      payload.matchingIncomeGross,
      payload.capMultiplier,
      payload.capLimit,
      payload.matchingIncomeNet,
      payload.cappedOverflow,
      payload.flushedLeftPv,
      payload.flushedRightPv,
      payload.directIncome
    ]
  );
  return rows[0];
}

async function getWeeklyUserSummary(client, userId, cycleStart, cycleEnd) {
  const { rows } = await q(client).query(
    `SELECT wus.*, wc.cycle_start, wc.cycle_end, r.name AS rank_name
     FROM weekly_user_summaries wus
     JOIN weekly_cycles wc ON wc.id = wus.cycle_id
     JOIN ranks r ON r.id = wus.rank_id
     WHERE wus.user_id = $1
       AND wc.cycle_start = $2
       AND wc.cycle_end = $3
     LIMIT 1`,
    [userId, cycleStart, cycleEnd]
  );
  return rows[0] || null;
}

async function getWeeklyUserSummaryByCycleId(client, userId, cycleId) {
  const { rows } = await q(client).query(
    `SELECT wus.*, wc.cycle_start, wc.cycle_end, r.name AS rank_name
     FROM weekly_user_summaries wus
     JOIN weekly_cycles wc ON wc.id = wus.cycle_id
     JOIN ranks r ON r.id = wus.rank_id
     WHERE wus.user_id = $1
       AND wus.cycle_id = $2
     LIMIT 1`,
    [userId, cycleId]
  );
  return rows[0] || null;
}

async function getWeeklyCycleResults(client, cycleId) {
  const { rows } = await q(client).query(
    `SELECT wus.*, u.username, u.email, r.name AS rank_name
     FROM weekly_user_summaries wus
     JOIN users u ON u.id = wus.user_id
     JOIN ranks r ON r.id = wus.rank_id
     WHERE wus.cycle_id = $1
     ORDER BY wus.created_at ASC`,
    [cycleId]
  );
  return rows;
}

async function createMonthlyCycle(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO monthly_cycles (month_start, month_end, notes)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [payload.monthStart, payload.monthEnd, payload.notes || null]
  );
  return rows[0];
}

async function listMonthlyCycles(client, limit = 12) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM monthly_cycles
     ORDER BY month_start DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function aggregateMonthlyBv(client, userId, monthStart, monthEnd) {
  const { rows } = await q(client).query(
    `WITH own_bv AS (
       SELECT COALESCE(SUM(oi.bv * oi.quantity), 0)::numeric(14,2) AS value
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
         AND o.status = 'paid'
         AND o.settlement_status = 'settled'
         AND p.is_qualifying = true
         AND o.settled_at >= $2::date
         AND o.settled_at < ($3::date + INTERVAL '1 day')
     ), team_bv AS (
       SELECT COALESCE(SUM(bvl.bv), 0)::numeric(14,2) AS value
       FROM binary_volume_ledger bvl
       WHERE bvl.ancestor_user_id = $1
         AND bvl.created_at >= $2::date
         AND bvl.created_at < ($3::date + INTERVAL '1 day')
     )
     SELECT (own_bv.value + team_bv.value)::numeric(14,2) AS monthly_bv
     FROM own_bv, team_bv`,
    [userId, monthStart, monthEnd]
  );
  return Number(rows[0]?.monthly_bv || 0);
}

async function aggregateMonthlyLegBv(client, userId, monthStart, monthEnd) {
  const { rows } = await q(client).query(
    `SELECT
       COALESCE(SUM(bvl.bv) FILTER (WHERE bvl.leg = 'left'), 0)::numeric(14,2) AS left_bv,
       COALESCE(SUM(bvl.bv) FILTER (WHERE bvl.leg = 'right'), 0)::numeric(14,2) AS right_bv
     FROM binary_volume_ledger bvl
     WHERE bvl.ancestor_user_id = $1
       AND bvl.created_at >= $2::date
       AND bvl.created_at < ($3::date + INTERVAL '1 day')`,
    [userId, monthStart, monthEnd]
  );
  return {
    leftBv: Number(rows[0]?.left_bv || 0),
    rightBv: Number(rows[0]?.right_bv || 0)
  };
}

async function aggregateMonthlyPv(client, userId, monthStart, monthEnd) {
  const { rows } = await q(client).query(
    `WITH own_pv AS (
       SELECT COALESCE(SUM(oi.pv * oi.quantity), 0)::numeric(14,2) AS value
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
         AND o.status = 'paid'
         AND o.settlement_status = 'settled'
         AND p.is_qualifying = true
         AND o.settled_at >= $2::date
         AND o.settled_at < ($3::date + INTERVAL '1 day')
     ), team_pv AS (
       SELECT COALESCE(SUM(bvl.pv), 0)::numeric(14,2) AS value
       FROM binary_volume_ledger bvl
       WHERE bvl.ancestor_user_id = $1
         AND bvl.created_at >= $2::date
         AND bvl.created_at < ($3::date + INTERVAL '1 day')
     )
     SELECT (own_pv.value + team_pv.value)::numeric(14,2) AS monthly_pv
     FROM own_pv, team_pv`,
    [userId, monthStart, monthEnd]
  );
  return Number(rows[0]?.monthly_pv || 0);
}

async function aggregateMonthlyIncomeBySource(client, userId, monthStart, monthEnd, source) {
  const { rows } = await q(client).query(
    `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total_income
     FROM wallet_transactions
     WHERE user_id = $1
       AND tx_type = 'credit'
       AND source = $4
       AND created_at >= $2::date
       AND created_at < ($3::date + INTERVAL '1 day')`,
    [userId, monthStart, monthEnd, source]
  );
  return Number(rows[0]?.total_income || 0);
}

async function upsertMonthlySummary(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO monthly_user_summaries (
      cycle_id,
      user_id,
      monthly_bv,
      monthly_pv,
      direct_income,
      matching_income,
      reward_amount,
      reward_label,
      qualified
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (cycle_id, user_id)
    DO UPDATE SET
      monthly_bv = EXCLUDED.monthly_bv,
      monthly_pv = EXCLUDED.monthly_pv,
      direct_income = EXCLUDED.direct_income,
      matching_income = EXCLUDED.matching_income,
      reward_amount = EXCLUDED.reward_amount,
      reward_label = EXCLUDED.reward_label,
      qualified = EXCLUDED.qualified
    RETURNING *`,
    [
      payload.cycleId,
      payload.userId,
      payload.monthlyBv,
      payload.monthlyPv,
      payload.directIncome,
      payload.matchingIncome,
      payload.rewardAmount,
      payload.rewardLabel,
      payload.qualified
    ]
  );
  return rows[0];
}

async function upsertMonthlyRewardQualification(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO monthly_reward_qualifications (
      cycle_id,
      user_id,
      monthly_bv,
      threshold_bv,
      reward_amount,
      reward_label,
      reward_level,
      reward_extra,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (cycle_id, user_id)
    DO UPDATE SET
      monthly_bv = EXCLUDED.monthly_bv,
      threshold_bv = EXCLUDED.threshold_bv,
      reward_amount = EXCLUDED.reward_amount,
      reward_label = EXCLUDED.reward_label,
      reward_level = EXCLUDED.reward_level,
      reward_extra = EXCLUDED.reward_extra,
      status = EXCLUDED.status
    RETURNING *`,
    [
      payload.cycleId,
      payload.userId,
      payload.monthlyBv,
      payload.thresholdBv,
      payload.rewardAmount,
      payload.rewardLabel,
      payload.rewardLevel || null,
      payload.rewardExtra || null,
      payload.status || 'qualified'
    ]
  );
  return rows[0];
}

async function getMonthlyStatus(client, userId, monthStart, monthEnd) {
  const { rows } = await q(client).query(
    `SELECT
      mc.id AS cycle_id,
      mc.month_start,
      mc.month_end,
      mus.monthly_bv,
      mus.monthly_pv,
      mus.direct_income,
      mus.matching_income,
      mus.reward_amount,
      mus.reward_label,
      mus.qualified,
      mrq.threshold_bv,
      mrq.status AS reward_status
     FROM monthly_cycles mc
     LEFT JOIN monthly_user_summaries mus ON mus.cycle_id = mc.id AND mus.user_id = $1
     LEFT JOIN monthly_reward_qualifications mrq ON mrq.cycle_id = mc.id AND mrq.user_id = $1
     WHERE mc.month_start = $2
       AND mc.month_end = $3
     LIMIT 1`,
    [userId, monthStart, monthEnd]
  );
  return rows[0] || null;
}

module.exports = {
  createWeeklyCycle,
  listWeeklyCycles,
  getWeeklyCycle,
  aggregateUserQualifyingVolumes,
  aggregateUserDirectIncome,
  createWeeklyUserSummary,
  getWeeklyUserSummary,
  getWeeklyUserSummaryByCycleId,
  getWeeklyCycleResults,
  createMonthlyCycle,
  listMonthlyCycles,
  aggregateMonthlyBv,
  aggregateMonthlyLegBv,
  aggregateMonthlyPv,
  aggregateMonthlyIncomeBySource,
  upsertMonthlySummary,
  upsertMonthlyRewardQualification,
  getMonthlyStatus
};
