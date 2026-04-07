const crypto = require('crypto');
const env = require('../config/env');
const { ApiError } = require('./ApiError');

function toBase64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const normalized = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64');
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest();
}

function createChallenge() {
  return toBase64Url(crypto.randomBytes(32));
}

function getExpectedOrigin(originHeader) {
  const explicitOrigin = String(env.webAuthnOrigin || '').trim();
  if (explicitOrigin) return explicitOrigin;

  const origin = String(originHeader || '').trim();
  if (!origin) {
    throw new ApiError(400, 'WebAuthn origin is missing');
  }

  return origin;
}

function getExpectedRpId(originValue) {
  const explicitRpId = String(env.webAuthnRpId || '').trim();
  if (explicitRpId) return explicitRpId;

  try {
    return new URL(originValue).hostname;
  } catch (_error) {
    throw new ApiError(500, 'Invalid WebAuthn origin configuration');
  }
}

function getRpInfo(originHeader) {
  const origin = getExpectedOrigin(originHeader);
  return {
    rpName: env.webAuthnRpName,
    origin,
    rpId: getExpectedRpId(origin)
  };
}

function parseClientDataJSON(base64urlValue) {
  const json = fromBase64Url(base64urlValue).toString('utf8');
  try {
    return JSON.parse(json);
  } catch (_error) {
    throw new ApiError(400, 'Invalid WebAuthn client data');
  }
}

function parseAuthenticatorData(base64urlValue) {
  const buffer = fromBase64Url(base64urlValue);
  if (buffer.length < 37) {
    throw new ApiError(400, 'Invalid authenticator data');
  }

  return {
    rpIdHash: buffer.subarray(0, 32),
    flags: buffer[32],
    counter: buffer.readUInt32BE(33)
  };
}

function hasUserPresence(flags) {
  return Boolean(flags & 0x01);
}

function ensureExpectedChallenge(clientData, expectedChallenge) {
  if (clientData.challenge !== expectedChallenge) {
    throw new ApiError(400, 'WebAuthn challenge mismatch');
  }
}

function ensureExpectedOrigin(clientData, expectedOrigin) {
  if (clientData.origin !== expectedOrigin) {
    throw new ApiError(400, 'WebAuthn origin mismatch');
  }
}

function ensureExpectedType(clientData, expectedType) {
  if (clientData.type !== expectedType) {
    throw new ApiError(400, 'Invalid WebAuthn operation type');
  }
}

function ensureExpectedRpIdHash(authenticatorData, rpId) {
  const expected = sha256(rpId);
  if (!authenticatorData.rpIdHash.equals(expected)) {
    throw new ApiError(400, 'WebAuthn RP ID mismatch');
  }
}

function verifyAssertionSignature({ publicKey, authenticatorData, clientDataJSON, signature }) {
  const verify = crypto.createVerify('SHA256');
  verify.update(Buffer.concat([fromBase64Url(authenticatorData), sha256(fromBase64Url(clientDataJSON))]));
  verify.end();
  return verify.verify(
    {
      key: fromBase64Url(publicKey),
      format: 'der',
      type: 'spki'
    },
    fromBase64Url(signature)
  );
}

function getFriendlyDeviceName(deviceName, fallbackIndex = 1) {
  const label = String(deviceName || '').trim();
  return label || `Biometric Device ${fallbackIndex}`;
}

module.exports = {
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
};
