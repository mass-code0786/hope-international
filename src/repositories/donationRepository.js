function q(client) {
  return client || require('../db/pool').pool;
}

function withPaging(limit = 20, offset = 0) {
  return {
    limit: Math.max(1, Number(limit) || 20),
    offset: Math.max(0, Number(offset) || 0)
  };
}

const BASE_SELECT = `
  SELECT
    d.*,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
      u.username
    ) AS donor_name
  FROM donations d
  JOIN users u ON u.id = d.user_id
`;

async function createDonation(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO donations (
      user_id,
      amount,
      purpose,
      note,
      status
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      payload.userId,
      payload.amount,
      payload.purpose,
      payload.note || null,
      payload.status || 'completed'
    ]
  );
  return rows[0] || null;
}

async function getDonationById(client, id) {
  const { rows } = await q(client).query(
    `${BASE_SELECT}
     WHERE d.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listUserDonations(client, userId, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const [listResult, countResult] = await Promise.all([
    q(client).query(
      `${BASE_SELECT}
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    q(client).query(
      `SELECT COUNT(*)
       FROM donations
       WHERE user_id = $1`,
      [userId]
    )
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function listAdminDonations(client, filters = {}, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [];

  if (filters.status) {
    values.push(filters.status);
    where.push(`d.status = $${values.length}`);
  }

  if (filters.userId) {
    values.push(filters.userId);
    where.push(`d.user_id = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`d.created_at >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    where.push(`d.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      u.username ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR COALESCE(u.first_name, '') ILIKE $${values.length}
      OR COALESCE(u.last_name, '') ILIKE $${values.length}
      OR d.purpose ILIKE $${values.length}
      OR COALESCE(d.note, '') ILIKE $${values.length}
      OR CAST(d.id AS TEXT) ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `${BASE_SELECT}
                   ${whereClause}
                   ORDER BY d.created_at DESC
                   LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const countSql = `SELECT COUNT(*)
                    FROM donations d
                    JOIN users u ON u.id = d.user_id
                    ${whereClause}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, [...values, limit, offset]),
    q(client).query(countSql, values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

module.exports = {
  createDonation,
  getDonationById,
  listUserDonations,
  listAdminDonations
};
