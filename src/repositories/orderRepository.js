function q(client) {
  return client || require('../db/pool').pool;
}

async function createOrder(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO orders (
      user_id,
      status,
      total_amount,
      total_pv,
      total_bv,
      delivery_address_id,
      delivery_address_snapshot,
      replacement_window_ends_at,
      settlement_status,
      settlement_notes
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      payload.userId,
      payload.status || 'paid',
      payload.totalAmount,
      payload.totalPv,
      payload.totalBv,
      payload.deliveryAddressId || null,
      payload.deliveryAddressSnapshot || null,
      payload.replacementWindowEndsAt || null,
      payload.settlementStatus || 'pending',
      payload.settlementNotes || null
    ]
  );
  return rows[0];
}

async function createOrderItem(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO order_items (order_id, product_id, quantity, price, pv, bv, line_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.orderId,
      payload.productId,
      payload.quantity,
      payload.price,
      payload.pv,
      payload.bv,
      payload.lineTotal
    ]
  );
  return rows[0];
}

async function listOrdersByUser(client, userId) {
  const { rows } = await q(client).query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function listPendingSettlementOrders(client, asOf, limit = 100) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM orders
     WHERE settlement_status = 'pending'
       AND replacement_window_ends_at <= $1
     ORDER BY replacement_window_ends_at ASC
     LIMIT $2`,
    [asOf, limit]
  );
  return rows;
}

async function getQualifyingOrderTotals(client, orderId) {
  const { rows } = await q(client).query(
    `SELECT
      COALESCE(SUM(oi.pv * oi.quantity) FILTER (WHERE p.is_qualifying = true), 0)::numeric(14,2) AS qualifying_pv,
      COALESCE(SUM(oi.bv * oi.quantity) FILTER (WHERE p.is_qualifying = true), 0)::numeric(14,2) AS qualifying_bv
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  return rows[0] || { qualifying_pv: '0.00', qualifying_bv: '0.00' };
}

async function markOrderSettled(client, orderId, notes = null) {
  const { rows } = await q(client).query(
    `UPDATE orders
     SET settlement_status = 'settled',
         settled_at = NOW(),
         settlement_processed_at = NOW(),
         settlement_notes = COALESCE($2, settlement_notes)
     WHERE id = $1
     RETURNING *`,
    [orderId, notes]
  );
  return rows[0] || null;
}

async function markOrderSettlementReversed(client, orderId, notes = null) {
  const { rows } = await q(client).query(
    `UPDATE orders
     SET settlement_status = 'reversed',
         settled_at = NULL,
         settlement_processed_at = NOW(),
         settlement_notes = COALESCE($2, settlement_notes)
     WHERE id = $1
     RETURNING *`,
    [orderId, notes]
  );
  return rows[0] || null;
}

async function createOrderSettlementEvent(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO order_settlement_events (
      order_id,
      previous_status,
      next_status,
      actor_user_id,
      event_type,
      notes,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      payload.orderId,
      payload.previousStatus || null,
      payload.nextStatus,
      payload.actorUserId || null,
      payload.eventType,
      payload.notes || null,
      payload.metadata || {}
    ]
  );
  return rows[0];
}

module.exports = {
  createOrder,
  createOrderItem,
  listOrdersByUser,
  listPendingSettlementOrders,
  getQualifyingOrderTotals,
  markOrderSettled,
  markOrderSettlementReversed,
  createOrderSettlementEvent
};
