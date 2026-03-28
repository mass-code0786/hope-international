function q(client) {
  return client || require('../db/pool').pool;
}

async function logAdminAction(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO admin_audit_logs (admin_user_id, action_type, target_entity, target_id, before_data, after_data, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.adminUserId,
      payload.actionType,
      payload.targetEntity,
      payload.targetId || null,
      payload.beforeData || null,
      payload.afterData || null,
      payload.metadata || {}
    ]
  );
  return rows[0];
}

async function getDashboardSummary(client) {
  const { rows } = await q(client).query(
    `SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE is_active = true) AS active_users,
      (SELECT COUNT(*) FROM users WHERE is_active = false) AS inactive_users,
      (SELECT COUNT(*) FROM orders WHERE status = 'paid') AS total_paid_orders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'paid') AS total_sales_amount,
      (SELECT COALESCE(SUM(total_bv), 0) FROM orders WHERE status = 'paid') AS total_bv,
      (SELECT COALESCE(SUM(total_pv), 0) FROM orders WHERE status = 'paid') AS total_pv,
      (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE tx_type = 'credit' AND source = 'direct_income') AS total_direct_income_paid,
      (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE tx_type = 'credit' AND source = 'matching_income') AS total_matching_income_paid,
      (SELECT COUNT(*) FROM monthly_reward_qualifications WHERE status IN ('qualified', 'processed')) AS total_reward_qualification_count,
      (SELECT COALESCE(SUM(reward_amount), 0) FROM monthly_reward_qualifications WHERE status IN ('qualified', 'processed')) AS total_reward_cash_value,
      (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE source = 'cap_overflow') AS total_cap_overflow,
      (SELECT cycle_start || ' to ' || cycle_end FROM weekly_cycles ORDER BY cycle_start DESC LIMIT 1) AS current_weekly_cycle_status,
      (SELECT month_start || ' to ' || month_end FROM monthly_cycles ORDER BY month_start DESC LIMIT 1) AS current_monthly_cycle_status`
  );
  return rows[0] || null;
}

async function getRecentOrders(client, limit = 10) {
  const { rows } = await q(client).query(
    `SELECT o.*, u.username, u.email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getRecentTransactions(client, limit = 10) {
  const { rows } = await q(client).query(
    `SELECT wt.*, u.username, u.email
     FROM wallet_transactions wt
     JOIN users u ON u.id = wt.user_id
     ORDER BY wt.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getWeeklySalesTrend(client, weeks = 8) {
  const { rows } = await q(client).query(
    `WITH series AS (
      SELECT generate_series(
        date_trunc('week', NOW()) - ($1::int - 1) * INTERVAL '1 week',
        date_trunc('week', NOW()),
        INTERVAL '1 week'
      ) AS week_start
    )
    SELECT
      series.week_start::date,
      COALESCE(SUM(o.total_amount), 0)::numeric(14,2) AS sales_amount,
      COALESCE(SUM(o.total_bv), 0)::numeric(14,2) AS sales_bv,
      COALESCE(SUM(o.total_pv), 0)::numeric(14,2) AS sales_pv,
      COALESCE(COUNT(o.id), 0)::int AS order_count
    FROM series
    LEFT JOIN orders o
      ON date_trunc('week', o.created_at) = series.week_start
      AND o.status = 'paid'
    GROUP BY series.week_start
    ORDER BY series.week_start ASC`,
    [weeks]
  );
  return rows;
}

async function getIncomeDistribution(client) {
  const { rows } = await q(client).query(
    `SELECT source, tx_type, COALESCE(SUM(amount), 0)::numeric(14,2) AS total_amount
     FROM wallet_transactions
     GROUP BY source, tx_type
     ORDER BY source, tx_type`
  );
  return rows;
}

async function getRewardQualificationTrend(client, months = 6) {
  const { rows } = await q(client).query(
    `WITH series AS (
      SELECT generate_series(
        date_trunc('month', NOW()) - ($1::int - 1) * INTERVAL '1 month',
        date_trunc('month', NOW()),
        INTERVAL '1 month'
      ) AS month_start
    )
    SELECT
      series.month_start::date,
      COALESCE(COUNT(mrq.id), 0)::int AS qualified_count,
      COALESCE(SUM(mrq.reward_amount), 0)::numeric(14,2) AS reward_cash
    FROM series
    LEFT JOIN monthly_cycles mc
      ON mc.month_start = series.month_start::date
    LEFT JOIN monthly_reward_qualifications mrq
      ON mrq.cycle_id = mc.id
      AND mrq.status IN ('qualified', 'processed')
    GROUP BY series.month_start
    ORDER BY series.month_start ASC`,
    [months]
  );
  return rows;
}

async function getOrderTrend(client, weeks = 8) {
  const { rows } = await q(client).query(
    `WITH series AS (
      SELECT generate_series(
        date_trunc('week', NOW()) - ($1::int - 1) * INTERVAL '1 week',
        date_trunc('week', NOW()),
        INTERVAL '1 week'
      ) AS week_start
    )
    SELECT
      series.week_start::date,
      COALESCE(COUNT(o.id), 0)::int AS total_orders,
      COALESCE(COUNT(o.id) FILTER (WHERE o.status = 'paid'), 0)::int AS paid_orders,
      COALESCE(COUNT(o.id) FILTER (WHERE o.status = 'pending'), 0)::int AS pending_orders,
      COALESCE(COUNT(o.id) FILTER (WHERE o.status = 'cancelled'), 0)::int AS cancelled_orders
    FROM series
    LEFT JOIN orders o ON date_trunc('week', o.created_at) = series.week_start
    GROUP BY series.week_start
    ORDER BY series.week_start ASC`,
    [weeks]
  );
  return rows;
}

function buildFilterQuery(baseSql, filters, sortSql = '', pagination = null) {
  const where = [];
  const values = [];

  filters.forEach((f) => {
    if (f.enabled) {
      values.push(...f.values);
      where.push(f.sql(values.length - f.values.length + 1));
    }
  });

  let sql = baseSql;
  if (where.length) {
    sql += ` WHERE ${where.join(' AND ')}`;
  }
  if (sortSql) {
    sql += ` ${sortSql}`;
  }
  if (pagination) {
    values.push(pagination.limit, pagination.offset);
    sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
  }

  return { sql, values, where, valueCount: values.length };
}

async function listUsers(client, filters, pagination) {
  const baseSql = `SELECT u.*, r.name AS rank_name, sponsor.username AS sponsor_username
                   FROM users u
                   JOIN ranks r ON r.id = u.rank_id
                   LEFT JOIN users sponsor ON sponsor.id = u.sponsor_id`;

  const built = buildFilterQuery(
    baseSql,
    [
      {
        enabled: Boolean(filters.search),
        values: [`%${filters.search}%`],
        sql: (i) => `(u.username ILIKE $${i} OR u.email ILIKE $${i} OR CAST(u.id AS TEXT) ILIKE $${i})`
      },
      {
        enabled: Boolean(filters.rank),
        values: [filters.rank],
        sql: (i) => `LOWER(r.name) = LOWER($${i})`
      },
      {
        enabled: filters.status === 'active' || filters.status === 'inactive',
        values: [filters.status === 'active'],
        sql: (i) => `u.is_active = $${i}`
      },
      {
        enabled: Boolean(filters.joinedFrom),
        values: [filters.joinedFrom],
        sql: (i) => `u.created_at >= $${i}::date`
      },
      {
        enabled: Boolean(filters.joinedTo),
        values: [filters.joinedTo],
        sql: (i) => `u.created_at < ($${i}::date + INTERVAL '1 day')`
      }
    ],
    'ORDER BY u.created_at DESC',
    pagination
  );

  const countSql = `SELECT COUNT(*) FROM users u JOIN ranks r ON r.id = u.rank_id${built.where.length ? ` WHERE ${built.where.join(' AND ')}` : ''}`;
  const countValues = built.values.slice(0, built.valueCount - 2);

  const [listResult, countResult] = await Promise.all([
    q(client).query(built.sql, built.values),
    q(client).query(countSql, countValues)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function searchUsers(client, filters, pagination) {
  const term = String(filters.q || '').trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(term);
  const searchLike = `%${term}%`;

  const values = [searchLike, pagination.limit, pagination.offset];
  const where = [
    `(u.username ILIKE $1 OR u.email ILIKE $1 OR CAST(u.id AS TEXT) ILIKE $1 OR COALESCE(sp.phone, '') ILIKE $1${isUuid ? ' OR u.id = $4::uuid' : ''})`
  ];

  if (isUuid) {
    values.push(term);
  }

  const { rows } = await q(client).query(
    `SELECT
      u.id,
      u.username,
      u.email,
      COALESCE(sp.phone, NULL) AS phone,
      u.is_active,
      u.created_at,
      r.id AS rank_id,
      r.name AS rank_name,
      sponsor.id AS sponsor_id,
      sponsor.username AS sponsor_username
     FROM users u
     JOIN ranks r ON r.id = u.rank_id
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     LEFT JOIN users sponsor ON sponsor.id = u.sponsor_id
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE WHEN ${isUuid ? 'u.id = $4::uuid' : 'FALSE'} THEN 0 ELSE 1 END,
       u.created_at DESC
     LIMIT $2 OFFSET $3`,
    values
  );

  const countValues = isUuid ? [searchLike, term] : [searchLike];
  const countSql = `SELECT COUNT(*)
                    FROM users u
                    LEFT JOIN seller_profiles sp ON sp.user_id = u.id
                    WHERE (u.username ILIKE $1 OR u.email ILIKE $1 OR CAST(u.id AS TEXT) ILIKE $1 OR COALESCE(sp.phone, '') ILIKE $1${isUuid ? ' OR u.id = $2::uuid' : ''})`;
  const countResult = await q(client).query(countSql, countValues);

  return {
    items: rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getUserProfile(client, userId) {
  const { rows } = await q(client).query(
    `SELECT u.*, r.name AS rank_name, sponsor.username AS sponsor_username, parent.username AS parent_username
     FROM users u
     JOIN ranks r ON r.id = u.rank_id
     LEFT JOIN users sponsor ON sponsor.id = u.sponsor_id
     LEFT JOIN users parent ON parent.id = u.parent_id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function getUserWalletSummary(client, userId) {
  const { rows } = await q(client).query(
    `SELECT w.*, 
      COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE user_id = $1 AND tx_type = 'credit'), 0)::numeric(14,2) AS total_credits,
      COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE user_id = $1 AND tx_type = 'debit'), 0)::numeric(14,2) AS total_debits
     FROM wallets w
     WHERE w.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function getUserLatestWeeklySummary(client, userId) {
  const { rows } = await q(client).query(
    `SELECT wus.*, wc.cycle_start, wc.cycle_end
     FROM weekly_user_summaries wus
     JOIN weekly_cycles wc ON wc.id = wus.cycle_id
     WHERE wus.user_id = $1
     ORDER BY wc.cycle_start DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getUserLatestMonthlySummary(client, userId) {
  const { rows } = await q(client).query(
    `SELECT mus.*, mc.month_start, mc.month_end
     FROM monthly_user_summaries mus
     JOIN monthly_cycles mc ON mc.id = mus.cycle_id
     WHERE mus.user_id = $1
     ORDER BY mc.month_start DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getUserOrders(client, userId, limit = 20) {
  const { rows } = await q(client).query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getUserTransactions(client, userId, limit = 50) {
  const { rows } = await q(client).query(
    `SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getUserChildren(client, userId) {
  const { rows } = await q(client).query(
    `SELECT id, username, email, placement_side, is_active, created_at FROM users WHERE parent_id = $1 ORDER BY created_at ASC`,
    [userId]
  );
  return rows;
}

async function updateUserStatus(client, userId, isActive) {
  const { rows } = await q(client).query(
    `UPDATE users SET is_active = $2 WHERE id = $1 RETURNING *`,
    [userId, isActive]
  );
  return rows[0] || null;
}

async function updateUserRank(client, userId, rankId) {
  const { rows } = await q(client).query(
    `UPDATE users SET rank_id = $2 WHERE id = $1 RETURNING *`,
    [userId, rankId]
  );
  return rows[0] || null;
}

async function listRanks(client) {
  const { rows } = await q(client).query(
    `SELECT
      id,
      name,
      cap_multiplier,
      is_active,
      display_order,
      min_bv
     FROM ranks
     ORDER BY COALESCE(display_order, 999999), min_bv ASC, name ASC`
  );
  return rows;
}

async function listProducts(client, filters, pagination) {
  const built = buildFilterQuery(
    `SELECT * FROM products`,
    [
      {
        enabled: Boolean(filters.search),
        values: [`%${filters.search}%`],
        sql: (i) => `(name ILIKE $${i} OR sku ILIKE $${i})`
      },
      {
        enabled: filters.isActive === true || filters.isActive === false,
        values: [filters.isActive],
        sql: (i) => `is_active = $${i}`
      },
      {
        enabled: filters.isQualifying === true || filters.isQualifying === false,
        values: [filters.isQualifying],
        sql: (i) => `is_qualifying = $${i}`
      },
      {
        enabled: Boolean(filters.category),
        values: [filters.category],
        sql: (i) => `LOWER(category) = LOWER($${i})`
      }
    ],
    'ORDER BY created_at DESC',
    pagination
  );

  const countSql = `SELECT COUNT(*) FROM products${built.where.length ? ` WHERE ${built.where.join(' AND ')}` : ''}`;
  const countValues = built.values.slice(0, built.valueCount - 2);

  const [listResult, countResult] = await Promise.all([
    q(client).query(built.sql, built.values),
    q(client).query(countSql, countValues)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getProductById(client, productId) {
  const { rows } = await q(client).query('SELECT * FROM products WHERE id = $1', [productId]);
  return rows[0] || null;
}

async function createProduct(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO products (sku, name, description, category, price, bv, pv, is_active, is_qualifying, image_url, gallery)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      payload.sku,
      payload.name,
      payload.description || null,
      payload.category || 'General',
      payload.price,
      payload.bv,
      payload.pv,
      payload.isActive ?? true,
      payload.isQualifying ?? true,
      payload.imageUrl || null,
      JSON.stringify(Array.isArray(payload.gallery) ? payload.gallery : [])
    ]
  );
  return rows[0];
}

async function updateProduct(client, productId, payload) {
  const { rows } = await q(client).query(
    `UPDATE products
     SET sku = $2,
         name = $3,
         description = $4,
         category = $5,
         price = $6,
         bv = $7,
         pv = $8,
         is_active = $9,
         is_qualifying = $10,
         image_url = $11,
         gallery = $12,
         moderation_status = $13,
         moderation_notes = $14,
         moderated_by = $15,
         moderated_at = $16
     WHERE id = $1
     RETURNING *`,
    [
      productId,
      payload.sku,
      payload.name,
      payload.description || null,
      payload.category || 'General',
      payload.price,
      payload.bv,
      payload.pv,
      payload.isActive ?? true,
      payload.isQualifying ?? true,
      payload.imageUrl || null,
      JSON.stringify(Array.isArray(payload.gallery) ? payload.gallery : []),
      payload.moderationStatus || 'approved',
      payload.moderationNotes || null,
      payload.moderatedBy || null,
      payload.moderatedAt || null
    ]
  );
  return rows[0] || null;
}

async function listOrders(client, filters, pagination) {
  const baseSql = `SELECT o.*, u.username, u.email
                   FROM orders o
                   JOIN users u ON u.id = o.user_id`;
  const built = buildFilterQuery(
    baseSql,
    [
      {
        enabled: Boolean(filters.search),
        values: [`%${filters.search}%`],
        sql: (i) => `(CAST(o.id AS TEXT) ILIKE $${i} OR u.username ILIKE $${i} OR u.email ILIKE $${i})`
      },
      {
        enabled: Boolean(filters.status),
        values: [filters.status],
        sql: (i) => `o.status = $${i}`
      },
      {
        enabled: Boolean(filters.userId),
        values: [filters.userId],
        sql: (i) => `o.user_id = $${i}`
      },
      {
        enabled: Boolean(filters.dateFrom),
        values: [filters.dateFrom],
        sql: (i) => `o.created_at >= $${i}::date`
      },
      {
        enabled: Boolean(filters.dateTo),
        values: [filters.dateTo],
        sql: (i) => `o.created_at < ($${i}::date + INTERVAL '1 day')`
      },
      {
        enabled: Boolean(filters.productId),
        values: [filters.productId],
        sql: (i) => `EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = $${i})`
      }
    ],
    'ORDER BY o.created_at DESC',
    pagination
  );

  const countSql = `SELECT COUNT(*)
                    FROM orders o
                    JOIN users u ON u.id = o.user_id
                    ${built.where.length ? ` WHERE ${built.where.join(' AND ')}` : ''}`;
  const countValues = built.values.slice(0, built.valueCount - 2);

  const [listResult, countResult] = await Promise.all([
    q(client).query(built.sql, built.values),
    q(client).query(countSql, countValues)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getOrderById(client, orderId) {
  const orderResult = await q(client).query(
    `SELECT o.*, u.username, u.email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [orderId]
  );
  const order = orderResult.rows[0] || null;
  if (!order) {
    return null;
  }

  const itemResult = await q(client).query(
    `SELECT oi.*, p.name AS product_name, p.sku
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );

  return {
    ...order,
    items: itemResult.rows
  };
}

async function listWalletTransactions(client, filters, pagination) {
  const baseSql = `SELECT wt.*, u.username, u.email
                   FROM wallet_transactions wt
                   JOIN users u ON u.id = wt.user_id`;
  const built = buildFilterQuery(
    baseSql,
    [
      {
        enabled: Boolean(filters.userId),
        values: [filters.userId],
        sql: (i) => `wt.user_id = $${i}`
      },
      {
        enabled: Boolean(filters.source),
        values: [filters.source],
        sql: (i) => `wt.source = $${i}`
      },
      {
        enabled: Boolean(filters.type),
        values: [filters.type],
        sql: (i) => `wt.tx_type = $${i}`
      },
      {
        enabled: Boolean(filters.dateFrom),
        values: [filters.dateFrom],
        sql: (i) => `wt.created_at >= $${i}::date`
      },
      {
        enabled: Boolean(filters.dateTo),
        values: [filters.dateTo],
        sql: (i) => `wt.created_at < ($${i}::date + INTERVAL '1 day')`
      },
      {
        enabled: Boolean(filters.search),
        values: [`%${filters.search}%`],
        sql: (i) => `(u.username ILIKE $${i} OR u.email ILIKE $${i} OR CAST(wt.id AS TEXT) ILIKE $${i})`
      }
    ],
    'ORDER BY wt.created_at DESC',
    pagination
  );

  const countSql = `SELECT COUNT(*) FROM wallet_transactions wt JOIN users u ON u.id = wt.user_id${built.where.length ? ` WHERE ${built.where.join(' AND ')}` : ''}`;
  const countValues = built.values.slice(0, built.valueCount - 2);

  const [listResult, countResult] = await Promise.all([
    q(client).query(built.sql, built.values),
    q(client).query(countSql, countValues)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getWalletSummary(client) {
  const { rows } = await q(client).query(
    `SELECT
      COALESCE(SUM(CASE WHEN tx_type = 'credit' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_credits,
      COALESCE(SUM(CASE WHEN tx_type = 'debit' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_debits,
      COALESCE(SUM(CASE WHEN source = 'direct_income' AND tx_type = 'credit' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_direct,
      COALESCE(SUM(CASE WHEN source = 'matching_income' AND tx_type = 'credit' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_matching,
      COALESCE(SUM(CASE WHEN source = 'reward_qualification' AND tx_type = 'credit' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_rewards,
      COALESCE(SUM(CASE WHEN source = 'cap_overflow' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_cap_overflow
     FROM wallet_transactions`
  );
  return rows[0] || null;
}

async function listWeeklyCycles(client, pagination) {
  const { rows } = await q(client).query(
    `SELECT wc.*,
      COALESCE(SUM(wus.matched_pv), 0)::numeric(14,2) AS total_matched_pv,
      COALESCE(SUM(wus.matching_income_gross), 0)::numeric(14,2) AS total_gross_income,
      COALESCE(SUM(wus.matching_income_net), 0)::numeric(14,2) AS total_paid_income,
      COALESCE(SUM(wus.capped_overflow), 0)::numeric(14,2) AS total_overflow,
      COALESCE(SUM(wus.flushed_left_pv + wus.flushed_right_pv), 0)::numeric(14,2) AS total_flushed_pv
     FROM weekly_cycles wc
     LEFT JOIN weekly_user_summaries wus ON wus.cycle_id = wc.id
     GROUP BY wc.id
     ORDER BY wc.cycle_start DESC
     LIMIT $1 OFFSET $2`,
    [pagination.limit, pagination.offset]
  );

  const countResult = await q(client).query('SELECT COUNT(*) FROM weekly_cycles');
  return {
    items: rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getWeeklyCycleById(client, cycleId) {
  const cycleResult = await q(client).query(
    `SELECT wc.* FROM weekly_cycles wc WHERE wc.id = $1`,
    [cycleId]
  );
  const cycle = cycleResult.rows[0] || null;
  if (!cycle) {
    return null;
  }

  const summaryResult = await q(client).query(
    `SELECT
      COALESCE(SUM(matched_pv), 0)::numeric(14,2) AS total_matched_pv,
      COALESCE(SUM(matching_income_gross), 0)::numeric(14,2) AS total_gross_income,
      COALESCE(SUM(matching_income_net), 0)::numeric(14,2) AS total_paid_income,
      COALESCE(SUM(capped_overflow), 0)::numeric(14,2) AS total_overflow,
      COALESCE(SUM(flushed_left_pv + flushed_right_pv), 0)::numeric(14,2) AS total_flushed_pv
     FROM weekly_user_summaries
     WHERE cycle_id = $1`,
    [cycleId]
  );

  const userRows = await q(client).query(
    `SELECT wus.*, u.username, u.email
     FROM weekly_user_summaries wus
     JOIN users u ON u.id = wus.user_id
     WHERE wus.cycle_id = $1
     ORDER BY wus.created_at ASC`,
    [cycleId]
  );

  return {
    cycle,
    summary: summaryResult.rows[0],
    users: userRows.rows
  };
}

async function listMonthlyCycles(client, pagination) {
  const { rows } = await q(client).query(
    `SELECT mc.*,
      COALESCE(SUM(mus.monthly_bv), 0)::numeric(14,2) AS total_monthly_bv,
      COALESCE(SUM(mus.monthly_pv), 0)::numeric(14,2) AS total_monthly_pv,
      COALESCE(SUM(mus.reward_amount), 0)::numeric(14,2) AS total_reward_amount,
      COALESCE(COUNT(mrq.id) FILTER (WHERE mrq.status IN ('qualified', 'processed')), 0)::int AS qualified_users
     FROM monthly_cycles mc
     LEFT JOIN monthly_user_summaries mus ON mus.cycle_id = mc.id
     LEFT JOIN monthly_reward_qualifications mrq ON mrq.cycle_id = mc.id
     GROUP BY mc.id
     ORDER BY mc.month_start DESC
     LIMIT $1 OFFSET $2`,
    [pagination.limit, pagination.offset]
  );

  const countResult = await q(client).query('SELECT COUNT(*) FROM monthly_cycles');
  return {
    items: rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getMonthlyCycleById(client, cycleId) {
  const cycleResult = await q(client).query(
    `SELECT * FROM monthly_cycles WHERE id = $1`,
    [cycleId]
  );
  const cycle = cycleResult.rows[0] || null;
  if (!cycle) {
    return null;
  }

  const summaryResult = await q(client).query(
    `SELECT
      COALESCE(SUM(monthly_bv), 0)::numeric(14,2) AS total_monthly_bv,
      COALESCE(SUM(monthly_pv), 0)::numeric(14,2) AS total_monthly_pv,
      COALESCE(SUM(reward_amount), 0)::numeric(14,2) AS total_reward_amount,
      COALESCE(COUNT(*) FILTER (WHERE qualified = true), 0)::int AS qualified_users
     FROM monthly_user_summaries
     WHERE cycle_id = $1`,
    [cycleId]
  );

  const userRows = await q(client).query(
    `SELECT mus.*, u.username, u.email
     FROM monthly_user_summaries mus
     JOIN users u ON u.id = mus.user_id
     WHERE mus.cycle_id = $1
     ORDER BY mus.created_at ASC`,
    [cycleId]
  );

  return {
    cycle,
    summary: summaryResult.rows[0],
    users: userRows.rows
  };
}

async function listRewardQualifications(client, filters, pagination) {
  const baseSql = `SELECT mrq.*, u.username, u.email, mc.month_start, mc.month_end
                   FROM monthly_reward_qualifications mrq
                   JOIN users u ON u.id = mrq.user_id
                   JOIN monthly_cycles mc ON mc.id = mrq.cycle_id`;

  const built = buildFilterQuery(
    baseSql,
    [
      {
        enabled: Boolean(filters.month),
        values: [filters.month],
        sql: (i) => `to_char(mc.month_start, 'YYYY-MM') = $${i}`
      },
      {
        enabled: Boolean(filters.status),
        values: [filters.status],
        sql: (i) => `mrq.status = $${i}`
      },
      {
        enabled: Boolean(filters.userId),
        values: [filters.userId],
        sql: (i) => `mrq.user_id = $${i}`
      },
      {
        enabled: Boolean(filters.search),
        values: [`%${filters.search}%`],
        sql: (i) => `(u.username ILIKE $${i} OR u.email ILIKE $${i} OR CAST(mrq.user_id AS TEXT) ILIKE $${i})`
      }
    ],
    'ORDER BY mc.month_start DESC, mrq.created_at DESC',
    pagination
  );

  const countSql = `SELECT COUNT(*)
                    FROM monthly_reward_qualifications mrq
                    JOIN users u ON u.id = mrq.user_id
                    JOIN monthly_cycles mc ON mc.id = mrq.cycle_id
                    ${built.where.length ? ` WHERE ${built.where.join(' AND ')}` : ''}`;
  const countValues = built.values.slice(0, built.valueCount - 2);

  const [listResult, countResult] = await Promise.all([
    q(client).query(built.sql, built.values),
    q(client).query(countSql, countValues)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getRewardSummary(client, filters) {
  const values = [];
  const where = [];

  if (filters.month) {
    values.push(filters.month);
    where.push(`to_char(mc.month_start, 'YYYY-MM') = $${values.length}`);
  }

  const { rows } = await q(client).query(
    `SELECT
      COALESCE(COUNT(*), 0)::int AS total_records,
      COALESCE(COUNT(*) FILTER (WHERE mrq.status = 'qualified'), 0)::int AS qualified_count,
      COALESCE(COUNT(*) FILTER (WHERE mrq.status = 'pending'), 0)::int AS pending_count,
      COALESCE(COUNT(*) FILTER (WHERE mrq.status = 'processed'), 0)::int AS processed_count,
      COALESCE(COUNT(*) FILTER (WHERE mrq.status = 'rejected'), 0)::int AS rejected_count,
      COALESCE(SUM(mrq.reward_amount), 0)::numeric(14,2) AS total_reward_cash
     FROM monthly_reward_qualifications mrq
     JOIN monthly_cycles mc ON mc.id = mrq.cycle_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    values
  );
  return rows[0] || null;
}

async function updateRewardQualificationStatus(client, qualificationId, status, adminUserId) {
  const { rows } = await q(client).query(
    `UPDATE monthly_reward_qualifications
     SET status = $2,
         processed_at = CASE WHEN $2 IN ('processed', 'rejected') THEN NOW() ELSE processed_at END,
         processed_by = CASE WHEN $2 IN ('processed', 'rejected') THEN $3 ELSE processed_by END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [qualificationId, status, adminUserId]
  );
  return rows[0] || null;
}

async function getRewardQualificationById(client, qualificationId) {
  const { rows } = await q(client).query(
    `SELECT * FROM monthly_reward_qualifications WHERE id = $1`,
    [qualificationId]
  );
  return rows[0] || null;
}

async function getTeamTree(client, userId, depth = 2) {
  const { rows } = await q(client).query(
    `WITH RECURSIVE tree AS (
      SELECT id, username, email, parent_id, placement_side, is_active, 0 AS level
      FROM users
      WHERE id = $1

      UNION ALL

      SELECT u.id, u.username, u.email, u.parent_id, u.placement_side, u.is_active, tree.level + 1
      FROM users u
      JOIN tree ON u.parent_id = tree.id
      WHERE tree.level < $2
    )
    SELECT * FROM tree ORDER BY level ASC, username ASC`,
    [userId, depth]
  );
  return rows;
}

async function getTeamSummary(client, userId) {
  const { rows } = await q(client).query(
    `WITH RECURSIVE descendants AS (
      SELECT id, parent_id, placement_side, is_active
      FROM users
      WHERE parent_id = $1

      UNION ALL

      SELECT u.id, u.parent_id, u.placement_side, u.is_active
      FROM users u
      JOIN descendants d ON u.parent_id = d.id
    )
    SELECT
      COALESCE(COUNT(*), 0)::int AS total_descendants,
      COALESCE(COUNT(*) FILTER (WHERE placement_side = 'left'), 0)::int AS left_count,
      COALESCE(COUNT(*) FILTER (WHERE placement_side = 'right'), 0)::int AS right_count,
      COALESCE(COUNT(*) FILTER (WHERE is_active = true), 0)::int AS active_count,
      COALESCE(COUNT(*) FILTER (WHERE is_active = false), 0)::int AS inactive_count
    FROM descendants`,
    [userId]
  );
  return rows[0] || null;
}

async function getSettings(client) {
  const { rows } = await q(client).query(
    `SELECT setting_key, setting_value, updated_by, updated_at
     FROM app_settings`
  );
  return rows;
}

async function upsertSetting(client, key, value, adminUserId) {
  const { rows } = await q(client).query(
    `INSERT INTO app_settings (setting_key, setting_value, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (setting_key)
     DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
     RETURNING *`,
    [key, value, adminUserId]
  );
  return rows[0];
}

module.exports = {
  logAdminAction,
  getDashboardSummary,
  getRecentOrders,
  getRecentTransactions,
  getWeeklySalesTrend,
  getIncomeDistribution,
  getRewardQualificationTrend,
  getOrderTrend,
  listUsers,
  searchUsers,
  getUserProfile,
  getUserWalletSummary,
  getUserLatestWeeklySummary,
  getUserLatestMonthlySummary,
  getUserOrders,
  getUserTransactions,
  getUserChildren,
  updateUserStatus,
  updateUserRank,
  listRanks,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  listOrders,
  getOrderById,
  listWalletTransactions,
  getWalletSummary,
  listWeeklyCycles,
  getWeeklyCycleById,
  listMonthlyCycles,
  getMonthlyCycleById,
  listRewardQualifications,
  getRewardSummary,
  getRewardQualificationById,
  updateRewardQualificationStatus,
  getTeamTree,
  getTeamSummary,
  getSettings,
  upsertSetting
};

