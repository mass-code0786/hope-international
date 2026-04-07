const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const webauthnRepository = require('../repositories/webauthnRepository');
const { createAuthToken } = require('../utils/token');
const { ApiError } = require('../utils/ApiError');
const {
  toBase64Url,
  createChallenge,
  getRpInfo,
  parseClientDataJSON,
  parseAuthenticatorData,
  hasUserPresence,
  ensureExpectedChallenge,
  ensureExpectedOrigin,
  ensureExpectedType,
  ensureExpectedRpIdHash,
  verifyAssertionSignature,
  getFriendlyDeviceName
} = require('../utils/webauthn');

const REGISTER_PURPOSE = 'register';
const LOGIN_PURPOSE = 'login';
const CHALLENGE_TTL_SECONDS = 300;

function debugWebauthn(label, details = {}) {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[webauthn.backend] ${label}`, details);
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function mapCredential(row) {
  return {
    id: row.id,
    credentialId: row.credential_id,
    deviceName: row.device_name || 'Biometric Device',
    transports: Array.isArray(row.transports) ? row.transports : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at
  };
}

function buildAllowCredentials(credentials) {
  return credentials.map((credential) => ({
    id: credential.credential_id,
    type: 'public-key',
    transports: Array.isArray(credential.transports) ? credential.transports : []
  }));
}

async function createRegisterOptions(userId, originHeader) {
  return withTransaction(async (client) => {
    const user = await userRepository.findById(client, userId);
    if (!user) throw new ApiError(404, 'User not found');

    const rp = getRpInfo(originHeader);
    const challenge = createChallenge();
    const existingCredentials = await webauthnRepository.listCredentialsByUserId(client, userId);

    await webauthnRepository.createChallenge(client, {
      userId,
      challenge,
      purpose: REGISTER_PURPOSE,
      rpId: rp.rpId,
      origin: rp.origin,
      ttlSeconds: CHALLENGE_TTL_SECONDS
    });

    const payload = {
      challenge,
      rp: {
        id: rp.rpId,
        name: rp.rpName
      },
      user: {
        id: toBase64Url(Buffer.from(user.id, 'utf8')),
        name: user.username,
        displayName: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username
      },
      timeout: CHALLENGE_TTL_SECONDS * 1000,
      attestation: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      },
      excludeCredentials: buildAllowCredentials(existingCredentials)
    };

    debugWebauthn('register-options', {
      userId,
      challengeLength: challenge.length,
      userHandleLength: payload.user.id.length,
      excludeCredentialsCount: payload.excludeCredentials.length,
      rpId: rp.rpId
    });

    return payload;
  });
}

async function verifyRegisterResponse(userId, payload, originHeader) {
  return withTransaction(async (client) => {
    debugWebauthn('register-verify-request', {
      userId,
      challengeLength: String(payload?.challenge || '').length,
      rawIdLength: String(payload?.rawId || '').length,
      credentialIdLength: String(payload?.credentialId || '').length,
      clientDataJSONLength: String(payload?.clientDataJSON || '').length,
      authenticatorDataLength: String(payload?.authenticatorData || '').length,
      attestationObjectLength: String(payload?.attestationObject || '').length,
      publicKeyLength: String(payload?.publicKey || '').length
    });

    const challengeRecord = await webauthnRepository.findActiveChallenge(client, payload.challenge, REGISTER_PURPOSE, { forUpdate: true });
    if (!challengeRecord) throw new ApiError(400, 'Registration challenge has expired');
    if (challengeRecord.user_id !== userId) throw new ApiError(403, 'Registration challenge does not belong to this user');

    const rp = getRpInfo(originHeader);
    if (challengeRecord.origin !== rp.origin || challengeRecord.rp_id !== rp.rpId) {
      throw new ApiError(400, 'WebAuthn relying party mismatch');
    }

    const clientData = parseClientDataJSON(payload.clientDataJSON);
    debugWebauthn('register-verify-client-data', {
      challengePreview: String(clientData?.challenge || '').slice(0, 24),
      type: clientData?.type,
      origin: clientData?.origin
    });
    ensureExpectedType(clientData, 'webauthn.create');
    ensureExpectedChallenge(clientData, challengeRecord.challenge);
    ensureExpectedOrigin(clientData, challengeRecord.origin);

    const authenticatorData = parseAuthenticatorData(payload.authenticatorData);
    ensureExpectedRpIdHash(authenticatorData, challengeRecord.rp_id);
    if (!hasUserPresence(authenticatorData.flags)) {
      throw new ApiError(400, 'Biometric confirmation was not completed');
    }

    if (!payload.credentialId || !payload.publicKey) {
      throw new ApiError(400, 'Incomplete WebAuthn registration response');
    }

    const existingCredential = await webauthnRepository.findCredentialByCredentialId(client, payload.credentialId);
    if (existingCredential) {
      throw new ApiError(409, 'This biometric credential is already registered');
    }

    const existingCredentials = await webauthnRepository.listCredentialsByUserId(client, userId);
    const credential = await webauthnRepository.createCredential(client, {
      userId,
      credentialId: payload.credentialId,
      publicKey: payload.publicKey,
      counter: authenticatorData.counter,
      transports: payload.transports || [],
      deviceName: getFriendlyDeviceName(payload.deviceName, existingCredentials.length + 1)
    });

    await webauthnRepository.markChallengeUsed(client, challengeRecord.id);

    return {
      enabled: true,
      credential: mapCredential(credential)
    };
  });
}

async function createLoginOptions(payload, originHeader) {
  return withTransaction(async (client) => {
    const username = normalizeUsername(payload.username);
    if (!username) throw new ApiError(400, 'Username is required for biometric login');

    const user = await userRepository.findByUsername(client, username);
    if (!user) throw new ApiError(404, 'No account found for biometric login');

    const credentials = await webauthnRepository.listCredentialsByUserId(client, user.id);
    if (!credentials.length) {
      throw new ApiError(404, 'Biometric login is not enabled for this account');
    }

    const rp = getRpInfo(originHeader);
    const challenge = createChallenge();
    await webauthnRepository.createChallenge(client, {
      userId: user.id,
      challenge,
      purpose: LOGIN_PURPOSE,
      rpId: rp.rpId,
      origin: rp.origin,
      ttlSeconds: CHALLENGE_TTL_SECONDS
    });

    const responsePayload = {
      challenge,
      rpId: rp.rpId,
      timeout: CHALLENGE_TTL_SECONDS * 1000,
      userVerification: 'preferred',
      allowCredentials: buildAllowCredentials(credentials)
    };

    debugWebauthn('login-options', {
      username,
      challengeLength: challenge.length,
      allowCredentialsCount: responsePayload.allowCredentials.length,
      rpId: rp.rpId
    });

    return responsePayload;
  });
}

async function verifyLoginResponse(payload, originHeader) {
  return withTransaction(async (client) => {
    debugWebauthn('login-verify-request', {
      challengeLength: String(payload?.challenge || '').length,
      rawIdLength: String(payload?.rawId || '').length,
      credentialIdLength: String(payload?.credentialId || '').length,
      clientDataJSONLength: String(payload?.clientDataJSON || '').length,
      authenticatorDataLength: String(payload?.authenticatorData || '').length,
      signatureLength: String(payload?.signature || '').length,
      userHandleLength: String(payload?.userHandle || '').length
    });

    const challengeRecord = await webauthnRepository.findActiveChallenge(client, payload.challenge, LOGIN_PURPOSE, { forUpdate: true });
    if (!challengeRecord) throw new ApiError(400, 'Biometric login challenge has expired');

    const rp = getRpInfo(originHeader);
    if (challengeRecord.origin !== rp.origin || challengeRecord.rp_id !== rp.rpId) {
      throw new ApiError(400, 'WebAuthn relying party mismatch');
    }

    const clientData = parseClientDataJSON(payload.clientDataJSON);
    debugWebauthn('login-verify-client-data', {
      challengePreview: String(clientData?.challenge || '').slice(0, 24),
      type: clientData?.type,
      origin: clientData?.origin
    });
    ensureExpectedType(clientData, 'webauthn.get');
    ensureExpectedChallenge(clientData, challengeRecord.challenge);
    ensureExpectedOrigin(clientData, challengeRecord.origin);

    const authenticatorData = parseAuthenticatorData(payload.authenticatorData);
    ensureExpectedRpIdHash(authenticatorData, challengeRecord.rp_id);
    if (!hasUserPresence(authenticatorData.flags)) {
      throw new ApiError(400, 'Biometric confirmation was not completed');
    }

    const credential = await webauthnRepository.findCredentialByCredentialId(client, payload.credentialId, { forUpdate: true });
    if (!credential || credential.user_id !== challengeRecord.user_id) {
      throw new ApiError(401, 'Biometric credential could not be verified');
    }

    const signatureValid = verifyAssertionSignature({
      publicKey: credential.public_key,
      authenticatorData: payload.authenticatorData,
      clientDataJSON: payload.clientDataJSON,
      signature: payload.signature
    });

    if (!signatureValid) throw new ApiError(401, 'Biometric verification failed');

    const previousCounter = Number(credential.counter || 0);
    const nextCounter = Number(authenticatorData.counter || 0);
    if (previousCounter > 0 && nextCounter > 0 && nextCounter <= previousCounter) {
      throw new ApiError(401, 'Biometric credential counter check failed');
    }

    const updatedCredential = await webauthnRepository.updateCredentialCounter(client, payload.credentialId, nextCounter);
    await webauthnRepository.markChallengeUsed(client, challengeRecord.id);

    const user = await userRepository.findById(client, credential.user_id);
    if (!user) throw new ApiError(404, 'User not found');

    return {
      user,
      token: createAuthToken(user, { rememberMe: Boolean(payload.rememberMe) }),
      credential: mapCredential(updatedCredential || credential)
    };
  });
}

async function getCredentialStatus(userId) {
  const credentials = await webauthnRepository.listCredentialsByUserId(null, userId);
  return {
    enabled: credentials.length > 0,
    credentials: credentials.map(mapCredential)
  };
}

async function removeCredential(userId, credentialId) {
  const removed = await webauthnRepository.deleteCredentialById(null, userId, credentialId);
  if (!removed) throw new ApiError(404, 'Biometric credential not found');

  const credentials = await webauthnRepository.listCredentialsByUserId(null, userId);
  return {
    enabled: credentials.length > 0,
    removedCredentialId: credentialId,
    credentials: credentials.map(mapCredential)
  };
}

module.exports = {
  createRegisterOptions,
  verifyRegisterResponse,
  createLoginOptions,
  verifyLoginResponse,
  getCredentialStatus,
  removeCredential
};
