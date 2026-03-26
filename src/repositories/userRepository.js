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
  const { rows } = await q(client).query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findByUsername(client, username) {
  const { rows } = await q(client).query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0] || null;
}

async function findById(client, id) {
  const { rows } = await q(client).query(
    `SELECT u.*, r.name AS rank_name, r.min_bv AS rank_min_bv, r.cap_multiplier AS rank_cap_multiplier
     FROM users u
     JOIN ranks r ON r.id = u.rank_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function createUser(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO users (username, email, password_hash, role, sponsor_id, parent_id, placement_side, rank_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.username,
      payload.email,
      payload.passwordHash,
      payload.role || 'user',
      payload.sponsorId || null,
      payload.parentId || null,
      payload.placementSide || null,
      payload.rankId
    ]
  );
  return rows[0];
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

async function findFirstAvailableParentByLeg(client, rootUserId, leg) {
  const { rows } = await q(client).query(
    `WITH RECURSIVE tree AS (
       SELECT id, left_child_id, right_child_id, created_at, 0 AS depth
       FROM users
       WHERE id = $1

       UNION ALL

       SELECT child.id, child.left_child_id, child.right_child_id, child.created_at, tree.depth + 1
       FROM tree
       JOIN LATERAL (VALUES (tree.left_child_id), (tree.right_child_id)) AS v(child_id)
         ON v.child_id IS NOT NULL
       JOIN users child ON child.id = v.child_id
     )
     SELECT id AS parent_id
     FROM tree
     WHERE CASE WHEN $2 = 'left' THEN left_child_id IS NULL ELSE right_child_id IS NULL END
     ORDER BY depth ASC, created_at ASC
     LIMIT 1`,
    [rootUserId, leg]
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

async function listAllUsers(client) {
  const { rows } = await q(client).query(
    `SELECT u.id, u.rank_id, r.cap_multiplier, r.name AS rank_name
     FROM users u
     JOIN ranks r ON r.id = u.rank_id`
  );
  return rows;
}

module.exports = {
  getRankByMinBv,
  getDefaultRank,
  findByEmail,
  findByUsername,
  findById,
  createUser,
  setChild,
  findFirstAvailableParentByLeg,
  getBinaryNode,
  addSelfVolume,
  addTeamVolume,
  updateRank,
  listForMatching,
  applyMatchingReset,
  getDirectChildren,
  listAllUsers
};
