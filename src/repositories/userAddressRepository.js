function q(client) {
  return client || require('../db/pool').pool;
}

async function getByUserId(client, userId) {
  const { rows } = await q(client).query('SELECT * FROM user_addresses WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function getByIdAndUserId(client, addressId, userId) {
  const { rows } = await q(client).query(
    'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2',
    [addressId, userId]
  );
  return rows[0] || null;
}

async function create(client, userId, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO user_addresses (
      user_id,
      full_name,
      mobile,
      alternate_mobile,
      country,
      state,
      city,
      area,
      address_line,
      postal_code,
      delivery_note,
      is_default
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
    RETURNING *`,
    [
      userId,
      payload.fullName,
      payload.mobile,
      payload.alternateMobile || null,
      payload.country,
      payload.state,
      payload.city,
      payload.area,
      payload.addressLine,
      payload.postalCode,
      payload.deliveryNote || null
    ]
  );
  return rows[0] || null;
}

async function update(client, userId, payload) {
  const { rows } = await q(client).query(
    `UPDATE user_addresses
     SET full_name = $2,
         mobile = $3,
         alternate_mobile = $4,
         country = $5,
         state = $6,
         city = $7,
         area = $8,
         address_line = $9,
         postal_code = $10,
         delivery_note = $11
     WHERE user_id = $1
     RETURNING *`,
    [
      userId,
      payload.fullName,
      payload.mobile,
      payload.alternateMobile || null,
      payload.country,
      payload.state,
      payload.city,
      payload.area,
      payload.addressLine,
      payload.postalCode,
      payload.deliveryNote || null
    ]
  );
  return rows[0] || null;
}

module.exports = {
  getByUserId,
  getByIdAndUserId,
  create,
  update
};
