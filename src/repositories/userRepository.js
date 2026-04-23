function q(client) {
  return client || require('../db/pool').pool;
}

async function getRankByMinBv(client, bv) {
  const { rows } = await q(client).query(
    `SELECT id, name, min_bv, cap_multiplier
     FROM ranks
     WHERE is_active = true
       AND min_bv <= $1
     ORDER BY min_bv DESC
     LIMIT 1`,
    [bv]
  );
  return rows[0] || null;
}

async function getDefaultRank(client) {
  const { rows } = await q(client).query(
    `SELECT id, name, min_bv, cap_multiplier
     FROM ranks
     WHERE is_active = true
     ORDER BY min_bv ASC
     LIMIT 1`
  );
  return rows[0] || null;
}

async function findByEmail(client, email) {
  const { rows } = await q(client).query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return rows[0] || null;
}

async function findByUsername(client, username) {
  const { rows } = await q(client).query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return rows[0] || null;
}

async function findByLogin(client, identifier) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM users
     WHERE LOWER(username) = LOWER($1)
        OR LOWER(email) = LOWER($1)
     ORDER BY CASE WHEN LOWER(username) = LOWER($1) THEN 0 ELSE 1 END
     LIMIT 1`,
    [identifier]
  );
  return rows[0] || null;
}

async function findById(client, id) {
  const { rows } = await q(client).query(
    `SELECT u.*, r.name AS rank_name, r.min_bv AS rank_min_bv, r.cap_multiplier AS rank_cap_multiplier,
            sponsor.username AS sponsor_username,
            sponsor.first_name AS sponsor_first_name,
            sponsor.last_name AS sponsor_last_name
     FROM users u
     JOIN ranks r ON r.id = u.rank_id
     LEFT JOIN users sponsor ON sponsor.id = u.sponsor_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function createUser(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO users (
      first_name,
      last_name,
      username,
      email,
      mobile_number,
      country_code,
      password_hash,
      role,
      sponsor_id,
      parent_id,
      placement_side,
      rank_id,
      welcome_spin_eligible
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      payload.firstName,
      payload.lastName,
      payload.username,
      payload.email,
      payload.mobileNumber,
      payload.countryCode,
      payload.passwordHash,
      payload.role || 'user',
      payload.sponsorId || null,
      payload.parentId || null,
      payload.placementSide || null,
      payload.rankId,
      Boolean(payload.welcomeSpinEligible)
    ]
  );
  return rows[0];
}

async function getWelcomeSpinState(client, userId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT id,
            welcome_spin_eligible,
            has_claimed_welcome_spin,
            welcome_spin_claimed_at,
            welcome_spin_reward_amount
     FROM users
     WHERE id = $1${lockClause}`,
    [userId]
  );
  return rows[0] || null;
}

async function markWelcomeSpinClaimed(client, userId, rewardAmount) {
  const { rows } = await q(client).query(
    `UPDATE users
     SET welcome_spin_eligible = FALSE,
         has_claimed_welcome_spin = TRUE,
         welcome_spin_claimed_at = NOW(),
         welcome_spin_reward_amount = $2
     WHERE id = $1
     RETURNING id,
               welcome_spin_eligible,
               has_claimed_welcome_spin,
               welcome_spin_claimed_at,
               welcome_spin_reward_amount`,
    [userId, rewardAmount]
  );
  return rows[0] || null;
}

async function setChild(client, parentId, side, childId) {
  const column = side === 'left' ? 'left_child_id' : 'right_child_id';
  const { rowCount } = await q(client).query(
    `UPDATE users
     SET ${column} = $2
     WHERE id = $1 AND ${column} IS NULL`,
    [parentId, childId]
  );
  return rowCount === 1;
}

async function findFirstAvailablePlacementInLegChain(client, rootUserId, rootLeg) {
  const { rows } = await q(client).query(
    `WITH RECURSIVE leg_chain AS (
       SELECT id, left_child_id, right_child_id, 0 AS depth
       FROM users
       WHERE id = $1

       UNION ALL

       SELECT child.id, child.left_child_id, child.right_child_id, leg_chain.depth + 1
       FROM leg_chain
       JOIN users child
         ON child.id = CASE
           WHEN $2 = 'left' THEN leg_chain.left_child_id
           ELSE leg_chain.right_child_id
         END
     )
     SELECT
       id AS parent_id,
       $2::placement_side AS placement_side
     FROM leg_chain
     WHERE CASE
       WHEN $2 = 'left' THEN left_child_id IS NULL
       ELSE right_child_id IS NULL
     END
     ORDER BY depth ASC, id ASC
     LIMIT 1`,
    [rootUserId, rootLeg]
  );

  return rows[0] || null;
}

async function getBinaryNode(client, id) {
  const { rows } = await q(client).query(
    `SELECT id, sponsor_id, parent_id, placement_side, left_child_id, right_child_id, self_pv, carry_left_pv, carry_right_pv, lifetime_bv
     FROM users
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function getTeamTreeNode(client, id) {
  const { rows } = await q(client).query(
    `SELECT
       u.id,
       u.username,
       u.email,
       u.first_name,
       u.last_name,
       u.parent_id,
       u.placement_side,
       u.left_child_id,
       u.right_child_id,
       u.is_active,
       u.created_at,
       (
         SELECT COUNT(*)::int
         FROM users child
         WHERE child.parent_id = u.id
       ) AS direct_count
     FROM users u
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function getTeamTreeNodesByIds(client, ids = []) {
  if (!Array.isArray(ids) || !ids.length) return [];

  const { rows } = await q(client).query(
    `SELECT
       u.id,
       u.username,
       u.email,
       u.first_name,
       u.last_name,
       u.parent_id,
       u.placement_side,
       u.left_child_id,
       u.right_child_id,
       u.is_active,
       u.created_at,
       (
         SELECT COUNT(*)::int
         FROM users child
         WHERE child.parent_id = u.id
       ) AS direct_count
     FROM users u
     WHERE u.id = ANY($1::uuid[])`,
    [ids]
  );
  return rows;
}

async function isNodeInSubtree(client, rootUserId, nodeId) {
  const { rows } = await q(client).query(
    `WITH RECURSIVE lineage AS (
       SELECT id, parent_id
       FROM users
       WHERE id = $2

       UNION ALL

       SELECT parent.id, parent.parent_id
       FROM users parent
       JOIN lineage ON lineage.parent_id = parent.id
     )
     SELECT 1
     FROM lineage
     WHERE id = $1
     LIMIT 1`,
    [rootUserId, nodeId]
  );

  return rows.length > 0;
}

async function addSelfVolume(client, userId, pv, bv) {
  await q(client).query(
    `UPDATE users
     SET self_pv = self_pv + $2,
         lifetime_bv = lifetime_bv + $3
     WHERE id = $1`,
    [userId, pv, bv]
  );
}

async function addTeamVolume(client, userId, leg, pv, bv) {
  if (leg === 'left') {
    await q(client).query(
      `UPDATE users
       SET carry_left_pv = carry_left_pv + $2,
           total_left_pv = total_left_pv + $2,
           lifetime_bv = lifetime_bv + $3
       WHERE id = $1`,
      [userId, pv, bv]
    );
    return;
  }

  await q(client).query(
    `UPDATE users
     SET carry_right_pv = carry_right_pv + $2,
         total_right_pv = total_right_pv + $2,
         lifetime_bv = lifetime_bv + $3
     WHERE id = $1`,
    [userId, pv, bv]
  );
}

async function updateRank(client, userId, rankId) {
  await q(client).query('UPDATE users SET rank_id = $2 WHERE id = $1', [userId, rankId]);
}

async function listForMatching(client) {
  const { rows } = await q(client).query(
    `SELECT u.id, u.carry_left_pv, u.carry_right_pv, u.rank_id, r.cap_multiplier, r.name AS rank_name
     FROM users u
     JOIN ranks r ON r.id = u.rank_id`
  );
  return rows;
}

async function applyMatchingReset(client, userId) {
  await q(client).query(
    `UPDATE users
     SET carry_left_pv = 0,
         carry_right_pv = 0
     WHERE id = $1`,
    [userId]
  );
}

async function getDirectChildren(client, userId) {
  const { rows } = await q(client).query(
    `SELECT id, username, email, placement_side, parent_id
     FROM users
     WHERE parent_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );
  return rows;
}

async function getDirectReferralCounts(client, userIds = []) {
  if (!Array.isArray(userIds) || !userIds.length) return new Map();

  const { rows } = await q(client).query(
    `SELECT sponsor_id AS user_id, COUNT(*)::int AS direct_referral_count
     FROM users
     WHERE sponsor_id = ANY($1::uuid[])
     GROUP BY sponsor_id`,
    [userIds]
  );

  return new Map(rows.map((row) => [row.user_id, Number(row.direct_referral_count || 0)]));
}

async function getSponsorUpline(client, userId, maxLevels = 7) {
  const { rows } = await q(client).query(
    `WITH RECURSIVE sponsor_chain AS (
       SELECT
         sponsor.id,
         sponsor.username,
         sponsor.email,
         sponsor.sponsor_id,
         1 AS level_number
       FROM users u
       JOIN users sponsor ON sponsor.id = u.sponsor_id
       WHERE u.id = $1

       UNION ALL

       SELECT
         sponsor.id,
         sponsor.username,
         sponsor.email,
         sponsor.sponsor_id,
         sponsor_chain.level_number + 1 AS level_number
       FROM sponsor_chain
       JOIN users sponsor ON sponsor.id = sponsor_chain.sponsor_id
       WHERE sponsor_chain.level_number < $2
     )
     SELECT id, username, email, sponsor_id, level_number
     FROM sponsor_chain
     ORDER BY level_number ASC`,
    [userId, maxLevels]
  );
  return rows;
}

async function listAllUsers(client) {
  const { rows } = await q(client).query(
    `SELECT u.id, u.rank_id, r.cap_multiplier, r.name AS rank_name
     FROM users u
     JOIN ranks r ON r.id = u.rank_id`
  );
  return rows;
}

async function findAdminUser(client) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM users
     WHERE role = 'admin'
        OR LOWER(username) = 'admin'
        OR LOWER(email) = 'admin@hopeinternational.uk'
     ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, created_at ASC
     LIMIT 1`
  );
  return rows[0] || null;
}

async function updateAdminCredentials(client, userId, payload) {
  const { rows } = await q(client).query(
    `UPDATE users
     SET first_name = COALESCE(NULLIF($2, ''), first_name),
         last_name = COALESCE(NULLIF($3, ''), last_name),
         username = $4,
         email = $5,
         mobile_number = COALESCE(NULLIF($6, ''), mobile_number),
         country_code = COALESCE(NULLIF($7, ''), country_code),
         password_hash = $8,
         role = 'admin',
         rank_id = $9
     WHERE id = $1
     RETURNING *`,
    [
      userId,
      payload.firstName || null,
      payload.lastName || null,
      payload.username,
      payload.email,
      payload.mobileNumber || null,
      payload.countryCode || null,
      payload.passwordHash,
      payload.rankId
    ]
  );
  return rows[0] || null;
}

module.exports = {
  getRankByMinBv,
  getDefaultRank,
  findByEmail,
  findByUsername,
  findByLogin,
  findById,
  findAdminUser,
  updateAdminCredentials,
  createUser,
  getWelcomeSpinState,
  markWelcomeSpinClaimed,
  setChild,
  findFirstAvailablePlacementInLegChain,
  getBinaryNode,
  getTeamTreeNode,
  getTeamTreeNodesByIds,
  isNodeInSubtree,
  addSelfVolume,
  addTeamVolume,
  updateRank,
  listForMatching,
  applyMatchingReset,
  getDirectChildren,
  getDirectReferralCounts,
  getSponsorUpline,
  listAllUsers
};


