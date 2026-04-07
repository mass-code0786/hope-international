function q(client) {
  return client || require('../db/pool').pool;
}

async function createChallenge(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO webauthn_challenges (
      user_id,
      challenge,
      purpose,
      rp_id,
      origin,
      expires_at
    )
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' seconds')::interval)
     RETURNING *`,
    [
      payload.userId || null,
      payload.challenge,
      payload.purpose,
      payload.rpId,
      payload.origin,
      String(payload.ttlSeconds || 300)
    ]
  );
  return rows[0] || null;
}

async function findActiveChallenge(client, challenge, purpose, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT *
     FROM webauthn_challenges
     WHERE challenge = $1
       AND purpose = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1${lockClause}`,
    [challenge, purpose]
  );
  return rows[0] || null;
}

async function markChallengeUsed(client, challengeId) {
  await q(client).query(
    `UPDATE webauthn_challenges
     SET used_at = NOW()
     WHERE id = $1`,
    [challengeId]
  );
}

async function createCredential(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO user_webauthn_credentials (
      user_id,
      credential_id,
      public_key,
      counter,
      transports,
      device_name
    )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      payload.userId,
      payload.credentialId,
      payload.publicKey,
      payload.counter || 0,
      payload.transports || [],
      payload.deviceName || null
    ]
  );
  return rows[0] || null;
}

async function listCredentialsByUserId(client, userId) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM user_webauthn_credentials
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function findCredentialByCredentialId(client, credentialId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT *
     FROM user_webauthn_credentials
     WHERE credential_id = $1
     LIMIT 1${lockClause}`,
    [credentialId]
  );
  return rows[0] || null;
}

async function updateCredentialCounter(client, credentialId, counter) {
  const { rows } = await q(client).query(
    `UPDATE user_webauthn_credentials
     SET counter = $2,
         last_used_at = NOW()
     WHERE credential_id = $1
     RETURNING *`,
    [credentialId, counter]
  );
  return rows[0] || null;
}

async function deleteCredentialById(client, userId, id) {
  const { rows } = await q(client).query(
    `DELETE FROM user_webauthn_credentials
     WHERE id = $1
       AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  return rows[0] || null;
}

module.exports = {
  createChallenge,
  findActiveChallenge,
  markChallengeUsed,
  createCredential,
  listCredentialsByUserId,
  findCredentialByCredentialId,
  updateCredentialCounter,
  deleteCredentialById
};
