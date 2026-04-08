function q(client) {
  return client || require('../db/pool').pool;
}

function buildOrderFilters(filters = {}, startIndex = 2) {
  const values = [];
  const where = [];

  if (filters.status) {
    values.push(filters.status);
    where.push(`o.status = $${startIndex + values.length - 1}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`o.created_at >= $${startIndex + values.length - 1}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    where.push(`o.created_at < ($${startIndex + values.length - 1}::date + INTERVAL '1 day')`);
  }

  return {
    values,
    sql: where.length ? `AND ${where.join(' AND ')}` : ''
  };
}

async function getSellerProfileByUserId(client, userId) {
  const { rows } = await q(client).query(
    `SELECT sp.*, u.username, u.email AS user_email, u.role
     FROM seller_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function getSellerProfileAccess(client, userId) {
  const { rows } = await q(client).query(
    `SELECT id, application_status
     FROM seller_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getSellerProfileById(client, profileId) {
  const { rows } = await q(client).query(
    `SELECT sp.*, u.username, u.email AS user_email, u.role
     FROM seller_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.id = $1`,
    [profileId]
  );
  return rows[0] || null;
}

async function upsertSellerProfile(client, userId, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO seller_profiles (
      user_id,
      legal_name,
      business_name,
      business_type,
      tax_id,
      phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      country,
      postal_code,
      kyc_details,
      application_status,
      rejection_reason,
      reviewed_by,
      reviewed_at,
      approved_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', NULL, NULL, NULL, NULL)
    ON CONFLICT (user_id)
    DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      business_name = EXCLUDED.business_name,
      business_type = EXCLUDED.business_type,
      tax_id = EXCLUDED.tax_id,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      address_line1 = EXCLUDED.address_line1,
      address_line2 = EXCLUDED.address_line2,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      country = EXCLUDED.country,
      postal_code = EXCLUDED.postal_code,
      kyc_details = EXCLUDED.kyc_details,
      application_status = 'pending',
      rejection_reason = NULL,
      reviewed_by = NULL,
      reviewed_at = NULL,
      approved_at = NULL,
      updated_at = NOW()
    RETURNING *`,
    [
      userId,
      payload.legalName,
      payload.businessName,
      payload.businessType || null,
      payload.taxId || null,
      payload.phone,
      payload.email || null,
      payload.addressLine1 || null,
      payload.addressLine2 || null,
      payload.city || null,
      payload.state || null,
      payload.country || null,
      payload.postalCode || null,
      payload.kycDetails || {}
    ]
  );
  return rows[0];
}

async function replaceSellerDocuments(client, sellerProfileId, documents = [], uploadedBy = null) {
  await q(client).query(
    `UPDATE seller_documents
     SET deleted_at = NOW()
     WHERE seller_profile_id = $1 AND deleted_at IS NULL`,
    [sellerProfileId]
  );

  if (!documents.length) {
    return [];
  }

  const inserted = [];
  for (const doc of documents) {
    const { rows } = await q(client).query(
      `INSERT INTO seller_documents (
        seller_profile_id,
        document_type,
        document_number,
        document_url,
        verification_status,
        notes,
        file_name,
        mime_type,
        file_size_bytes,
        uploaded_by
      )
      VALUES ($1, $2, $3, $4, 'submitted', $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        sellerProfileId,
        doc.documentType,
        doc.documentNumber || null,
        doc.documentUrl || null,
        doc.notes || null,
        doc.fileName || null,
        doc.mimeType || null,
        doc.fileSizeBytes || null,
        uploadedBy
      ]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

async function createSellerDocument(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO seller_documents (
      seller_profile_id,
      document_type,
      document_number,
      document_url,
      verification_status,
      notes,
      file_name,
      mime_type,
      file_size_bytes,
      uploaded_by
    )
    VALUES ($1, $2, $3, $4, 'submitted', $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      payload.sellerProfileId,
      payload.documentType,
      payload.documentNumber || null,
      payload.documentUrl || null,
      payload.notes || null,
      payload.fileName || null,
      payload.mimeType || null,
      payload.fileSizeBytes || null,
      payload.uploadedBy || null
    ]
  );
  return rows[0];
}

async function getSellerDocuments(client, sellerProfileId) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM seller_documents
     WHERE seller_profile_id = $1
       AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [sellerProfileId]
  );
  return rows;
}

async function getSellerDocumentById(client, sellerProfileId, documentId) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM seller_documents
     WHERE id = $1
       AND seller_profile_id = $2
       AND deleted_at IS NULL`,
    [documentId, sellerProfileId]
  );
  return rows[0] || null;
}

async function softDeleteSellerDocument(client, sellerProfileId, documentId) {
  const { rows } = await q(client).query(
    `UPDATE seller_documents
     SET deleted_at = NOW()
     WHERE id = $1
       AND seller_profile_id = $2
       AND deleted_at IS NULL
     RETURNING *`,
    [documentId, sellerProfileId]
  );
  return rows[0] || null;
}

async function createSellerProduct(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO products (
      sku,
      name,
      description,
      category,
      price,
      pv,
      bv,
      is_active,
      is_qualifying,
      seller_profile_id,
      moderation_status,
      moderation_notes,
      moderated_by,
      moderated_at,
      image_url,
      gallery
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9, 'pending', $10, NULL, NULL, $11, $12)
    RETURNING *`,
    [
      payload.sku,
      payload.name,
      payload.description || null,
      payload.category || 'General',
      payload.price,
      payload.pv,
      payload.bv,
      payload.isQualifying ?? true,
      payload.sellerProfileId,
      payload.moderationNotes || null,
      payload.imageUrl || null,
      JSON.stringify(Array.isArray(payload.gallery) ? payload.gallery : [])
    ]
  );
  return rows[0];
}

async function findSellerProductById(client, productId) {
  const { rows } = await q(client).query(
    `SELECT p.*, sp.user_id AS seller_user_id
     FROM products p
     LEFT JOIN seller_profiles sp ON sp.id = p.seller_profile_id
     WHERE p.id = $1`,
    [productId]
  );
  return rows[0] || null;
}

async function findSellerProductByIdForOwner(client, sellerProfileId, productId) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM products
     WHERE id = $1
       AND seller_profile_id = $2`,
    [productId, sellerProfileId]
  );
  return rows[0] || null;
}

async function updateSellerProduct(client, productId, payload) {
  const { rows } = await q(client).query(
    `UPDATE products
     SET sku = $2,
         name = $3,
         description = $4,
         category = $5,
         price = $6,
         bv = $7,
         pv = $8,
         is_qualifying = $9,
         image_url = $10,
         gallery = $11,
         moderation_status = 'pending',
         moderation_notes = $12,
         moderated_by = NULL,
         moderated_at = NULL,
         is_active = false
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
      payload.isQualifying ?? true,
      payload.imageUrl || null,
      JSON.stringify(Array.isArray(payload.gallery) ? payload.gallery : []),
      payload.moderationNotes || null
    ]
  );
  return rows[0] || null;
}

async function listSellerProducts(client, sellerProfileId) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM products
     WHERE seller_profile_id = $1
     ORDER BY created_at DESC`,
    [sellerProfileId]
  );
  return rows;
}

async function getSellerProductSummary(client, sellerProfileId) {
  const { rows } = await q(client).query(
    `SELECT
      COALESCE(COUNT(*), 0)::int AS total_products,
      COALESCE(COUNT(*) FILTER (WHERE moderation_status = 'pending'), 0)::int AS pending_products,
      COALESCE(COUNT(*) FILTER (WHERE moderation_status = 'approved'), 0)::int AS approved_products,
      COALESCE(COUNT(*) FILTER (WHERE moderation_status = 'rejected'), 0)::int AS rejected_products
     FROM products
     WHERE seller_profile_id = $1`,
    [sellerProfileId]
  );
  return rows[0] || null;
}

async function getSellerOrderSummary(client, sellerProfileId) {
  const { rows } = await q(client).query(
    `SELECT
      COALESCE(COUNT(DISTINCT o.id), 0)::int AS total_orders,
      COALESCE(SUM(oi.line_total), 0)::numeric(14,2) AS total_sales_amount,
      COALESCE(SUM(oi.bv * oi.quantity), 0)::numeric(14,2) AS total_bv,
      COALESCE(SUM(oi.pv * oi.quantity), 0)::numeric(14,2) AS total_pv
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE p.seller_profile_id = $1`,
    [sellerProfileId]
  );
  return rows[0] || null;
}

async function listSellerOrders(client, sellerProfileId, filters, pagination) {
  const { values: extraValues, sql: extraSql } = buildOrderFilters(filters, 3);
  const values = [sellerProfileId];
  values.push(...extraValues);

  let productFilterSql = '';
  if (filters.productId) {
    values.push(filters.productId);
    productFilterSql = `AND oi.product_id = $${values.length}`;
  }

  const startIndex = values.length + 1;
  values.push(pagination.limit, pagination.offset);

  const { rows } = await q(client).query(
    `WITH seller_items AS (
      SELECT
        oi.order_id,
        oi.id AS order_item_id,
        oi.product_id,
        oi.quantity,
        oi.price,
        oi.pv,
        oi.bv,
        oi.line_total,
        p.name AS product_name,
        p.sku,
        p.category
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE p.seller_profile_id = $1
        ${extraSql}
        ${productFilterSql}
    ),
    selected_orders AS (
      SELECT DISTINCT order_id
      FROM seller_items
    )
    SELECT
      o.id,
      o.status,
      o.created_at,
      u.id AS buyer_user_id,
      u.username AS buyer_username,
      u.email AS buyer_email,
      COALESCE(SUM(si.line_total), 0)::numeric(14,2) AS seller_order_amount,
      COALESCE(SUM(si.bv * si.quantity), 0)::numeric(14,2) AS seller_order_bv,
      COALESCE(SUM(si.pv * si.quantity), 0)::numeric(14,2) AS seller_order_pv,
      json_agg(
        json_build_object(
          'orderItemId', si.order_item_id,
          'productId', si.product_id,
          'productName', si.product_name,
          'sku', si.sku,
          'category', si.category,
          'quantity', si.quantity,
          'price', si.price,
          'lineTotal', si.line_total,
          'bv', si.bv,
          'pv', si.pv
        )
        ORDER BY si.order_item_id
      ) AS items
    FROM selected_orders so
    JOIN orders o ON o.id = so.order_id
    JOIN users u ON u.id = o.user_id
    JOIN seller_items si ON si.order_id = o.id
    GROUP BY o.id, u.id
    ORDER BY o.created_at DESC
    LIMIT $${startIndex} OFFSET $${startIndex + 1}`,
    values
  );

  const summaryValues = [sellerProfileId];
  summaryValues.push(...extraValues);
  let summaryProductFilter = '';
  if (filters.productId) {
    summaryValues.push(filters.productId);
    summaryProductFilter = `AND oi.product_id = $${summaryValues.length}`;
  }

  const countResult = await q(client).query(
    `SELECT
      COALESCE(COUNT(DISTINCT o.id), 0)::int AS total_orders,
      COALESCE(SUM(oi.line_total), 0)::numeric(14,2) AS total_sales_amount,
      COALESCE(SUM(oi.bv * oi.quantity), 0)::numeric(14,2) AS total_bv,
      COALESCE(SUM(oi.pv * oi.quantity), 0)::numeric(14,2) AS total_pv
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE p.seller_profile_id = $1
       ${extraSql}
       ${summaryProductFilter}`,
    summaryValues
  );

  return {
    items: rows,
    total: Number(countResult.rows[0]?.total_orders || 0),
    summary: countResult.rows[0] || null
  };
}

async function createSellerEarningEntry(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO seller_earnings_ledger (
      seller_profile_id,
      seller_user_id,
      order_id,
      order_item_id,
      source_type,
      gross_amount,
      net_earning_amount,
      commission_rate,
      platform_margin_amount,
      bv,
      pv,
      earning_status,
      settled_at,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      payload.sellerProfileId,
      payload.sellerUserId,
      payload.orderId,
      payload.orderItemId || null,
      payload.sourceType || 'order_sale',
      payload.grossAmount,
      payload.netEarningAmount,
      payload.commissionRate ?? 0.5,
      payload.platformMarginAmount ?? 0,
      payload.bv,
      payload.pv,
      payload.earningStatus || 'pending',
      payload.settledAt || null,
      payload.metadata || {}
    ]
  );
  return rows[0];
}

async function updateSellerEarningsStatusByOrder(client, orderId, fromStatuses, toStatus, options = {}) {
  const values = [orderId, toStatus, fromStatuses];
  let settledSql = '';
  if (options.settledAtNow) {
    settledSql = ', settled_at = NOW()';
  }

  const { rows } = await q(client).query(
    `UPDATE seller_earnings_ledger
     SET earning_status = $2
         ${settledSql}
     WHERE order_id = $1
       AND earning_status = ANY($3::seller_earning_status[])
     RETURNING *`,
    values
  );
  return rows;
}

async function getSellerPayoutSummary(client, sellerProfileId) {
  const earningsResult = await q(client).query(
    `SELECT
      COALESCE(SUM(net_earning_amount), 0)::numeric(14,2) AS total_earnings,
      COALESCE(SUM(net_earning_amount) FILTER (WHERE earning_status IN ('pending', 'eligible', 'held')), 0)::numeric(14,2) AS pending_earnings,
      COALESCE(SUM(net_earning_amount) FILTER (WHERE earning_status IN ('finalized', 'paid')), 0)::numeric(14,2) AS processed_earnings
     FROM seller_earnings_ledger
     WHERE seller_profile_id = $1`,
    [sellerProfileId]
  );

  const payoutsResult = await q(client).query(
    `SELECT
      COALESCE(SUM(net_amount), 0)::numeric(14,2) AS total_payouts,
      COALESCE(SUM(net_amount) FILTER (WHERE payout_status IN ('pending', 'processing')), 0)::numeric(14,2) AS pending_payouts,
      COALESCE(SUM(net_amount) FILTER (WHERE payout_status = 'processed'), 0)::numeric(14,2) AS processed_payouts
     FROM seller_payouts
     WHERE seller_profile_id = $1`,
    [sellerProfileId]
  );

  return {
    ...(earningsResult.rows[0] || {}),
    ...(payoutsResult.rows[0] || {})
  };
}

async function listSellerPayouts(client, sellerProfileId, filters, pagination) {
  const values = [sellerProfileId];
  const where = ['seller_profile_id = $1'];

  if (filters.status) {
    values.push(filters.status);
    where.push(`payout_status = $${values.length}`);
  }
  if (filters.periodStart) {
    values.push(filters.periodStart);
    where.push(`period_start >= $${values.length}::date`);
  }
  if (filters.periodEnd) {
    values.push(filters.periodEnd);
    where.push(`period_end <= $${values.length}::date`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countValues = [...values];
  values.push(pagination.limit, pagination.offset);

  const { rows } = await q(client).query(
    `SELECT *
     FROM seller_payouts
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  const countResult = await q(client).query(
    `SELECT COUNT(*)::int AS count
     FROM seller_payouts
     ${whereSql}`,
    countValues
  );

  return {
    items: rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getSellerPayoutPeriodSummary(client, sellerProfileId, months = 6) {
  const { rows } = await q(client).query(
    `WITH months AS (
      SELECT generate_series(
        date_trunc('month', NOW()) - ($2::int - 1) * INTERVAL '1 month',
        date_trunc('month', NOW()),
        INTERVAL '1 month'
      ) AS month_start
    ),
    earnings AS (
      SELECT
        date_trunc('month', created_at) AS month_start,
        SUM(net_earning_amount)::numeric(14,2) AS earnings
      FROM seller_earnings_ledger
      WHERE seller_profile_id = $1
      GROUP BY date_trunc('month', created_at)
    ),
    payouts AS (
      SELECT
        date_trunc('month', created_at) AS month_start,
        SUM(net_amount)::numeric(14,2) AS payouts
      FROM seller_payouts
      WHERE seller_profile_id = $1
      GROUP BY date_trunc('month', created_at)
    )
    SELECT
      months.month_start::date,
      COALESCE(earnings.earnings, 0)::numeric(14,2) AS earnings,
      COALESCE(payouts.payouts, 0)::numeric(14,2) AS payouts
    FROM months
    LEFT JOIN earnings ON earnings.month_start = months.month_start
    LEFT JOIN payouts ON payouts.month_start = months.month_start
    ORDER BY months.month_start ASC`,
    [sellerProfileId, months]
  );
  return rows;
}

async function getRecentModerationActivity(client, sellerProfileId, limit = 5) {
  const { rows } = await q(client).query(
    `SELECT
      p.id,
      p.name,
      p.moderation_status,
      p.moderation_notes,
      p.moderated_at,
      p.updated_at
     FROM products p
     WHERE p.seller_profile_id = $1
       AND p.moderated_at IS NOT NULL
     ORDER BY p.moderated_at DESC
     LIMIT $2`,
    [sellerProfileId, limit]
  );
  return rows;
}

async function logSellerActivity(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO seller_activity_logs (
      actor_user_id,
      seller_profile_id,
      action_type,
      target_entity,
      target_id,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      payload.actorUserId,
      payload.sellerProfileId || null,
      payload.actionType,
      payload.targetEntity,
      payload.targetId || null,
      payload.metadata || {}
    ]
  );
  return rows[0];
}

async function listSellerApplications(client, filters, pagination) {
  const values = [];
  const where = [];

  if (filters.status) {
    values.push(filters.status);
    where.push(`sp.application_status = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(sp.business_name ILIKE $${values.length} OR sp.legal_name ILIKE $${values.length} OR u.username ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  values.push(pagination.limit, pagination.offset);
  const listSql = `
    SELECT sp.*, u.username, u.email AS user_email
    FROM seller_profiles sp
    JOIN users u ON u.id = sp.user_id
    ${whereSql}
    ORDER BY sp.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}`;

  const countValues = values.slice(0, values.length - 2);
  const countSql = `
    SELECT COUNT(*)
    FROM seller_profiles sp
    JOIN users u ON u.id = sp.user_id
    ${whereSql}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, values),
    q(client).query(countSql, countValues)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function reviewSellerApplication(client, profileId, payload) {
  const { rows } = await q(client).query(
    `UPDATE seller_profiles
     SET application_status = $2,
         rejection_reason = $3,
         reviewed_by = $4,
         reviewed_at = NOW(),
         approved_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE approved_at END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [profileId, payload.status, payload.rejectionReason || null, payload.reviewedBy]
  );
  return rows[0] || null;
}

async function setUserRole(client, userId, role) {
  const { rows } = await q(client).query(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING *`,
    [userId, role]
  );
  return rows[0] || null;
}

async function createProductModerationLog(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO seller_product_moderation_logs (
      product_id,
      seller_profile_id,
      admin_user_id,
      previous_status,
      next_status,
      notes
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      payload.productId,
      payload.sellerProfileId || null,
      payload.adminUserId || null,
      payload.previousStatus || null,
      payload.nextStatus,
      payload.notes || null
    ]
  );
  return rows[0];
}

module.exports = {
  getSellerProfileByUserId,
  getSellerProfileAccess,
  getSellerProfileById,
  upsertSellerProfile,
  replaceSellerDocuments,
  createSellerDocument,
  getSellerDocuments,
  getSellerDocumentById,
  softDeleteSellerDocument,
  createSellerProduct,
  findSellerProductById,
  findSellerProductByIdForOwner,
  updateSellerProduct,
  listSellerProducts,
  getSellerProductSummary,
  getSellerOrderSummary,
  listSellerOrders,
  createSellerEarningEntry,
  updateSellerEarningsStatusByOrder,
  getSellerPayoutSummary,
  listSellerPayouts,
  getSellerPayoutPeriodSummary,
  getRecentModerationActivity,
  logSellerActivity,
  listSellerApplications,
  reviewSellerApplication,
  setUserRole,
  createProductModerationLog
};

