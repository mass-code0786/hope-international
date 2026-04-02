function q(client) {
  return client || require('../db/pool').pool;
}

async function getActiveStakingByUserId(client, userId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT *
     FROM btct_staking_plans
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1${lockClause}`,
    [userId]
  );
  return rows[0] || null;
}

async function createStakingPlan(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO btct_staking_plans (
       user_id,
       staking_amount_btct,
       reward_amount_usd,
       payout_interval_days,
       status,
       started_at,
       next_payout_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.userId,
      payload.stakingAmountBtct,
      payload.rewardAmountUsd,
      payload.payoutIntervalDays,
      payload.status || 'active',
      payload.startedAt,
      payload.nextPayoutAt
    ]
  );
  return rows[0] || null;
}

async function listPayoutsByUserId(client, userId, limit = 100) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM btct_staking_payouts
     WHERE user_id = $1
     ORDER BY payout_date DESC, created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function listDueStakingPlans(client, asOf, limit = 100) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM btct_staking_plans
     WHERE status = 'active'
       AND next_payout_at <= $1
     ORDER BY next_payout_at ASC
     LIMIT $2`,
    [asOf, limit]
  );
  return rows;
}

async function getStakingPlanById(client, stakingId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT *
     FROM btct_staking_plans
     WHERE id = $1
     LIMIT 1${lockClause}`,
    [stakingId]
  );
  return rows[0] || null;
}

async function createStakingPayout(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO btct_staking_payouts (
       staking_id,
       user_id,
       cycle_number,
       payout_amount_usd,
       credited_to,
       payout_date,
       wallet_transaction_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (staking_id, cycle_number) DO NOTHING
     RETURNING *`,
    [
      payload.stakingId,
      payload.userId,
      payload.cycleNumber,
      payload.payoutAmountUsd,
      payload.creditedTo || 'withdrawal_wallet',
      payload.payoutDate,
      payload.walletTransactionId || null
    ]
  );
  return rows[0] || null;
}

async function updateStakingPayoutWalletTransaction(client, payoutId, walletTransactionId) {
  const { rows } = await q(client).query(
    `UPDATE btct_staking_payouts
     SET wallet_transaction_id = COALESCE(wallet_transaction_id, $2)
     WHERE id = $1
     RETURNING *`,
    [payoutId, walletTransactionId]
  );
  return rows[0] || null;
}

async function updateStakingPlanPayoutProgress(client, stakingId, payload) {
  const { rows } = await q(client).query(
    `UPDATE btct_staking_plans
     SET last_payout_at = $2,
         next_payout_at = $3,
         total_payouts = $4,
         total_payout_amount = $5,
         status = COALESCE($6, status)
     WHERE id = $1
     RETURNING *`,
    [
      stakingId,
      payload.lastPayoutAt || null,
      payload.nextPayoutAt,
      payload.totalPayouts,
      payload.totalPayoutAmount,
      payload.status || null
    ]
  );
  return rows[0] || null;
}

async function listStakingPlansAdmin(client, limit = 200) {
  const { rows } = await q(client).query(
    `SELECT s.*, u.username, u.email
     FROM btct_staking_plans s
     JOIN users u ON u.id = s.user_id
     ORDER BY CASE WHEN s.status = 'active' THEN 0 ELSE 1 END, s.next_payout_at ASC, s.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function listStakingPayoutsAdmin(client, limit = 200) {
  const { rows } = await q(client).query(
    `SELECT p.*, u.username, u.email
     FROM btct_staking_payouts p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.payout_date DESC, p.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = {
  getActiveStakingByUserId,
  createStakingPlan,
  listPayoutsByUserId,
  listDueStakingPlans,
  getStakingPlanById,
  createStakingPayout,
  updateStakingPayoutWalletTransaction,
  updateStakingPlanPayoutProgress,
  listStakingPlansAdmin,
  listStakingPayoutsAdmin
};
