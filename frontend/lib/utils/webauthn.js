'use client';

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

export async function createWebAuthnCredential(options) {
  if (!supportsWebAuthn()) {
    throw new Error('Biometric login is not supported on this device');
  }

  const credential = await navigator.credentials.create({
    publicKey: {
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
    }
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

  return {
    challenge: options.challenge,
    credentialId: toBase64Url(credential.rawId),
    clientDataJSON: toBase64Url(response.clientDataJSON),
    authenticatorData: toBase64Url(response.getAuthenticatorData()),
    publicKey: toBase64Url(publicKey),
    transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    deviceName: `${getPlatformName()} Passkey`
  };
}

export async function getWebAuthnAssertion(options) {
  if (!supportsWebAuthn()) {
    throw new Error('Biometric login is not supported on this device');
  }

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: fromBase64Url(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification || 'preferred',
      allowCredentials: Array.isArray(options.allowCredentials) ? options.allowCredentials.map(mapAllowCredential) : []
    }
  });

  if (!credential || credential.type !== 'public-key') {
    throw new Error('Biometric login was cancelled');
  }

  const response = credential.response;
  return {
    challenge: options.challenge,
    credentialId: toBase64Url(credential.rawId),
    clientDataJSON: toBase64Url(response.clientDataJSON),
    authenticatorData: toBase64Url(response.authenticatorData),
    signature: toBase64Url(response.signature)
  };
}

export { supportsWebAuthn };
