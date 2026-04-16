function q(client) {
  return client || require('../db/pool').pool;
}

function withPaging(limit, offset) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 100));
  const safeOffset = Math.max(0, Number(offset || 0));
  return { limit: safeLimit, offset: safeOffset };
}

async function createNowPaymentsPayment(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO nowpayments_payments (
      user_id,
      deposit_id,
      order_id,
      provider,
      provider_payment_id,
      provider_order_id,
      network,
      requested_amount,
      expected_amount,
      price_amount,
      price_currency,
      pay_currency,
      pay_amount,
      payment_address,
      pay_address,
      payment_status,
      actually_paid,
      outcome_amount,
      outcome_currency,
      payment_url,
      ipn_callback_url,
      expires_at,
      is_credited,
      credited_at,
      status_history,
      raw_payload
    )
    VALUES (
      $1, $2, $3, 'nowpayments', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb, $25::jsonb
    )
    RETURNING *`,
    [
      payload.userId,
      payload.depositId || null,
      payload.orderId || null,
      payload.providerPaymentId || null,
      payload.providerOrderId || null,
      payload.network || 'BSC/BEP20',
      payload.requestedAmount,
      payload.expectedAmount ?? null,
      payload.priceAmount,
      payload.priceCurrency || 'usd',
      payload.payCurrency,
      payload.payAmount ?? null,
      payload.paymentAddress || null,
      payload.payAddress || null,
      payload.paymentStatus || 'waiting',
      payload.actuallyPaid ?? 0,
      payload.outcomeAmount ?? null,
      payload.outcomeCurrency || null,
      payload.paymentUrl || null,
      payload.ipnCallbackUrl || null,
      payload.expiresAt || null,
      Boolean(payload.isCredited),
      payload.creditedAt || null,
      JSON.stringify(payload.statusHistory || []),
      JSON.stringify(payload.rawPayload || {})
    ]
  );
  return rows[0] || null;
}

async function getNowPaymentsPaymentById(client, id, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT np.*, u.username, u.email
     FROM nowpayments_payments np
     JOIN users u ON u.id = np.user_id
     WHERE np.id = $1${lockClause}`,
    [id]
  );
  return rows[0] || null;
}

async function getNowPaymentsPaymentByProviderPaymentId(client, providerPaymentId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT np.*, u.username, u.email
     FROM nowpayments_payments np
     JOIN users u ON u.id = np.user_id
     WHERE np.provider_payment_id = $1${lockClause}`,
    [providerPaymentId]
  );
  return rows[0] || null;
}

async function getNowPaymentsPaymentByProviderOrderId(client, providerOrderId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT np.*, u.username, u.email
     FROM nowpayments_payments np
     JOIN users u ON u.id = np.user_id
     WHERE np.provider_order_id = $1${lockClause}`,
    [providerOrderId]
  );
  return rows[0] || null;
}

async function updateNowPaymentsPayment(client, id, payload = {}) {
  const values = [id];
  const setClauses = ['updated_at = NOW()'];

  function addField(column, value, options = {}) {
    values.push(value);
    if (options.jsonb) {
      setClauses.push(`${column} = $${values.length}::jsonb`);
      return;
    }
    setClauses.push(`${column} = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'providerPaymentId')) addField('provider_payment_id', payload.providerPaymentId || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'providerOrderId')) addField('provider_order_id', payload.providerOrderId || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'network')) addField('network', payload.network || 'BSC/BEP20');
  if (Object.prototype.hasOwnProperty.call(payload, 'requestedAmount')) addField('requested_amount', payload.requestedAmount ?? null);
  if (Object.prototype.hasOwnProperty.call(payload, 'expectedAmount')) addField('expected_amount', payload.expectedAmount ?? null);
  if (Object.prototype.hasOwnProperty.call(payload, 'payCurrency')) addField('pay_currency', payload.payCurrency || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'payAmount')) addField('pay_amount', payload.payAmount ?? null);
  if (Object.prototype.hasOwnProperty.call(payload, 'paymentAddress')) addField('payment_address', payload.paymentAddress || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'payAddress')) addField('pay_address', payload.payAddress || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'paymentStatus')) addField('payment_status', payload.paymentStatus || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'actuallyPaid')) addField('actually_paid', payload.actuallyPaid ?? 0);
  if (Object.prototype.hasOwnProperty.call(payload, 'outcomeAmount')) addField('outcome_amount', payload.outcomeAmount ?? null);
  if (Object.prototype.hasOwnProperty.call(payload, 'outcomeCurrency')) addField('outcome_currency', payload.outcomeCurrency || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'paymentUrl')) addField('payment_url', payload.paymentUrl || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'expiresAt')) addField('expires_at', payload.expiresAt || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'isCredited')) addField('is_credited', Boolean(payload.isCredited));
  if (Object.prototype.hasOwnProperty.call(payload, 'creditedAt')) addField('credited_at', payload.creditedAt || null);
  if (Object.prototype.hasOwnProperty.call(payload, 'statusHistory')) addField('status_history', JSON.stringify(payload.statusHistory || []), { jsonb: true });
  if (Object.prototype.hasOwnProperty.call(payload, 'rawPayload')) addField('raw_payload', JSON.stringify(payload.rawPayload || {}), { jsonb: true });

  const { rows } = await q(client).query(
    `UPDATE nowpayments_payments
     SET ${setClauses.join(', ')}
     WHERE id = $1
     RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function listNowPaymentsPaymentsAdmin(client, filters = {}, paginationInput = {}) {
  const { limit, offset } = withPaging(paginationInput.limit, paginationInput.offset);
  const values = [];
  const where = [];

  if (filters.status) {
    values.push(filters.status);
    where.push(`np.payment_status = $${values.length}`);
  }
  if (filters.userId) {
    values.push(filters.userId);
    where.push(`np.user_id = $${values.length}`);
  }
  if (filters.depositId) {
    values.push(filters.depositId);
    where.push(`np.deposit_id = $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      u.username ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR COALESCE(np.provider_payment_id, '') ILIKE $${values.length}
      OR COALESCE(np.provider_order_id, '') ILIKE $${values.length}
      OR CAST(np.id AS TEXT) ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `SELECT np.*, u.username, u.email
                   FROM nowpayments_payments np
                   JOIN users u ON u.id = np.user_id
                   ${whereClause}
                   ORDER BY np.created_at DESC
                   LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const countSql = `SELECT COUNT(*)
                    FROM nowpayments_payments np
                    JOIN users u ON u.id = np.user_id
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
  createNowPaymentsPayment,
  getNowPaymentsPaymentById,
  getNowPaymentsPaymentByProviderPaymentId,
  getNowPaymentsPaymentByProviderOrderId,
  updateNowPaymentsPayment,
  listNowPaymentsPaymentsAdmin
};
