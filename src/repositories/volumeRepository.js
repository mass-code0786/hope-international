function q(client) {
  return client || require('../db/pool').pool;
}

async function createVolumeLedgerEntry(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO binary_volume_ledger (ancestor_user_id, source_user_id, order_id, leg, pv, bv)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      payload.ancestorUserId,
      payload.sourceUserId,
      payload.orderId,
      payload.leg,
      payload.pv,
      payload.bv
    ]
  );

  return rows[0];
}

module.exports = {
  createVolumeLedgerEntry
};
