'use client';

function logWebauthn(label, details = {}) {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[webauthn.frontend] ${label}`, details);
}

function toBase64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function supportsWebAuthn() {
  return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential) && Boolean(navigator?.credentials);
}

function getPlatformName() {
  if (typeof navigator === 'undefined') return 'This device';
  const platform = String(navigator.userAgentData?.platform || navigator.platform || '').trim();
  return platform || 'This device';
}

function mapAllowCredential(credential) {
  return {
    id: fromBase64Url(credential.id),
    type: 'public-key',
    transports: Array.isArray(credential.transports) ? credential.transports : undefined
  };
}

function getCreationOptions(options) {
  if (typeof window !== 'undefined' && typeof window.PublicKeyCredential?.parseCreationOptionsFromJSON === 'function') {
    logWebauthn('using-native-creation-json-parser', {
      challengeLength: String(options?.challenge || '').length,
      userIdLength: String(options?.user?.id || '').length
    });
    return window.PublicKeyCredential.parseCreationOptionsFromJSON(options);
  }

  return {
    challenge: fromBase64Url(options.challenge),
    rp: options.rp,
    user: {
      id: fromBase64Url(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 }
    ],
    timeout: options.timeout,
    attestation: options.attestation || 'none',
    authenticatorSelection: options.authenticatorSelection,
    excludeCredentials: Array.isArray(options.excludeCredentials) ? options.excludeCredentials.map(mapAllowCredential) : []
  };
}

function getRequestOptions(options) {
  if (typeof window !== 'undefined' && typeof window.PublicKeyCredential?.parseRequestOptionsFromJSON === 'function') {
    logWebauthn('using-native-request-json-parser', {
      challengeLength: String(options?.challenge || '').length,
      allowCredentialsCount: Array.isArray(options?.allowCredentials) ? options.allowCredentials.length : 0
    });
    return window.PublicKeyCredential.parseRequestOptionsFromJSON(options);
  }

  return {
    challenge: fromBase64Url(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: options.userVerification || 'preferred',
    allowCredentials: Array.isArray(options.allowCredentials) ? options.allowCredentials.map(mapAllowCredential) : []
  };
}

export async function createWebAuthnCredential(options) {
  if (!supportsWebAuthn()) {
    throw new Error('Biometric login is not supported on this device');
  }

  if (!Array.isArray(options?.pubKeyCredParams) || !options.pubKeyCredParams.length) {
    throw new Error('Biometric setup failed');
  }

  logWebauthn('register-options', {
    challengeLength: String(options?.challenge || '').length,
    userIdLength: String(options?.user?.id || '').length,
    pubKeyCredParamsCount: Array.isArray(options?.pubKeyCredParams) ? options.pubKeyCredParams.length : 0,
    excludeCredentialsCount: Array.isArray(options?.excludeCredentials) ? options.excludeCredentials.length : 0
  });

  const publicKeyOptions = getCreationOptions(options);
  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions
  });

  if (!credential || credential.type !== 'public-key') {
    throw new Error('Biometric setup was cancelled');
  }

  const response = credential.response;
  if (typeof response.getPublicKey !== 'function' || typeof response.getAuthenticatorData !== 'function') {
    throw new Error('This browser does not expose enough passkey data to finish setup');
  }

  const publicKey = response.getPublicKey();
  if (!publicKey) {
    throw new Error('This browser could not export the passkey public key');
  }

  const credentialJson = typeof credential.toJSON === 'function' ? credential.toJSON() : null;
  const payload = {
    challenge: options.challenge,
    rawId: credentialJson?.rawId || toBase64Url(credential.rawId),
    credentialId: credentialJson?.id || toBase64Url(credential.rawId),
    clientDataJSON: credentialJson?.response?.clientDataJSON || toBase64Url(response.clientDataJSON),
    authenticatorData: toBase64Url(response.getAuthenticatorData()),
    attestationObject: credentialJson?.response?.attestationObject || toBase64Url(response.attestationObject),
    publicKey: toBase64Url(publicKey),
    transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    deviceName: `${getPlatformName()} Passkey`
  };

  logWebauthn('register-payload', {
    credentialIdLength: String(payload.credentialId || '').length,
    rawIdLength: String(payload.rawId || '').length,
    clientDataJSONLength: String(payload.clientDataJSON || '').length,
    attestationObjectLength: String(payload.attestationObject || '').length,
    authenticatorDataLength: String(payload.authenticatorData || '').length
  });

  return payload;
}

export async function getWebAuthnAssertion(options) {
  if (!supportsWebAuthn()) {
    throw new Error('Biometric login is not supported on this device');
  }

  logWebauthn('login-options', {
    challengeLength: String(options?.challenge || '').length,
    allowCredentialsCount: Array.isArray(options?.allowCredentials) ? options.allowCredentials.length : 0
  });

  const publicKeyOptions = getRequestOptions(options);
  const credential = await navigator.credentials.get({
    publicKey: publicKeyOptions
  });

  if (!credential || credential.type !== 'public-key') {
    throw new Error('Biometric login was cancelled');
  }

  const response = credential.response;
  const credentialJson = typeof credential.toJSON === 'function' ? credential.toJSON() : null;
  const payload = {
    challenge: options.challenge,
    rawId: credentialJson?.rawId || toBase64Url(credential.rawId),
    credentialId: credentialJson?.id || toBase64Url(credential.rawId),
    clientDataJSON: credentialJson?.response?.clientDataJSON || toBase64Url(response.clientDataJSON),
    authenticatorData: credentialJson?.response?.authenticatorData || toBase64Url(response.authenticatorData),
    signature: credentialJson?.response?.signature || toBase64Url(response.signature),
    userHandle: credentialJson?.response?.userHandle || (response.userHandle ? toBase64Url(response.userHandle) : null)
  };

  logWebauthn('login-payload', {
    credentialIdLength: String(payload.credentialId || '').length,
    clientDataJSONLength: String(payload.clientDataJSON || '').length,
    authenticatorDataLength: String(payload.authenticatorData || '').length,
    signatureLength: String(payload.signature || '').length,
    userHandleLength: String(payload.userHandle || '').length
  });

  return payload;
}

export { supportsWebAuthn };
