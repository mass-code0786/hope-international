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
    hha.*,
    u.username,
    u.email
  FROM helping_hand_applications hha
  JOIN users u ON u.id = hha.user_id
`;

async function getApprovedDepositTotalForUser(client, userId) {
  const { rows } = await q(client).query(
    `SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total_deposit
     FROM wallet_deposit_requests
     WHERE user_id = $1
       AND status = 'approved'`,
    [userId]
  );
  return Number(rows[0]?.total_deposit || 0);
}

async function createApplication(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO helping_hand_applications (
      user_id,
      applicant_name,
      applicant_phone,
      applicant_address,
      applicant_relation,
      help_category,
      requested_amount,
      reason,
      document_url,
      status,
      admin_note
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NULL)
    RETURNING *`,
    [
      payload.userId,
      payload.applicantName,
      payload.applicantPhone,
      payload.applicantAddress,
      payload.applicantRelation,
      payload.helpCategory,
      payload.requestedAmount,
      payload.reason,
      payload.documentUrl || null
    ]
  );
  return rows[0] || null;
}

async function getApplicationById(client, id) {
  const { rows } = await q(client).query(
    `${BASE_SELECT}
     WHERE hha.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listUserApplications(client, userId, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [userId, limit, offset];

  const [listResult, countResult] = await Promise.all([
    q(client).query(
      `${BASE_SELECT}
       WHERE hha.user_id = $1
       ORDER BY hha.created_at DESC
       LIMIT $2 OFFSET $3`,
      values
    ),
    q(client).query(
      `SELECT COUNT(*)
       FROM helping_hand_applications
       WHERE user_id = $1`,
      [userId]
    )
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function listAdminApplications(client, filters = {}, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [];

  if (filters.status) {
    values.push(filters.status);
    where.push(`hha.status = $${values.length}`);
  }

  if (filters.userId) {
    values.push(filters.userId);
    where.push(`hha.user_id = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`hha.created_at >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    where.push(`hha.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      u.username ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR hha.applicant_name ILIKE $${values.length}
      OR hha.applicant_phone ILIKE $${values.length}
      OR hha.applicant_relation ILIKE $${values.length}
      OR hha.help_category ILIKE $${values.length}
      OR CAST(hha.id AS TEXT) ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `${BASE_SELECT}
                   ${whereClause}
                   ORDER BY hha.created_at DESC
                   LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const countSql = `SELECT COUNT(*)
                    FROM helping_hand_applications hha
                    JOIN users u ON u.id = hha.user_id
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

async function updateApplicationStatus(client, id, payload) {
  const hasAdminNote = Object.prototype.hasOwnProperty.call(payload, 'adminNote');
  const { rows } = await q(client).query(
    `UPDATE helping_hand_applications
     SET status = $2,
         admin_note = CASE WHEN $3::boolean THEN $4 ELSE admin_note END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, payload.status, hasAdminNote, hasAdminNote ? (payload.adminNote || null) : null]
  );
  return rows[0] || null;
}

module.exports = {
  getApprovedDepositTotalForUser,
  createApplication,
  getApplicationById,
  listUserApplications,
  listAdminApplications,
  updateApplicationStatus
};
