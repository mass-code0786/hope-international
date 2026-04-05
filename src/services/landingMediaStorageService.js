const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { ApiError } = require('../utils/ApiError');

const MEDIA_PUBLIC_PREFIX = '/media';
const MEDIA_ROOT = path.resolve(__dirname, '../../storage');
const LANDING_MEDIA_ROOT = path.join(MEDIA_ROOT, 'landing');
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

function normalizeSlotKey(slotKey) {
  return String(slotKey || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseImageDataUrl(dataUrl) {
  const normalized = String(dataUrl || '').trim();
  const match = normalized.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new ApiError(400, 'Only JPG, PNG, and WEBP image uploads are supported');
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) {
    throw new ApiError(400, 'Uploaded image is empty');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, 'Uploaded image must be 3MB or smaller');
  }

  return {
    mimeType,
    extension: MIME_TO_EXTENSION[mimeType],
    buffer
  };
}

function resolveManagedMediaPath(publicUrl) {
  const normalized = String(publicUrl || '').trim();
  if (!normalized.startsWith(`${MEDIA_PUBLIC_PREFIX}/`)) {
    return null;
  }

  const relativePath = normalized.slice(MEDIA_PUBLIC_PREFIX.length + 1);
  const absolutePath = path.resolve(MEDIA_ROOT, relativePath);
  if (!absolutePath.startsWith(MEDIA_ROOT)) {
    return null;
  }

  return absolutePath;
}

async function saveLandingMediaImage(slotKey, imageDataUrl) {
  const safeSlotKey = normalizeSlotKey(slotKey);
  if (!safeSlotKey) {
    throw new ApiError(400, 'Invalid landing media slot');
  }

  const parsed = parseImageDataUrl(imageDataUrl);
  const fileName = `${safeSlotKey}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${parsed.extension}`;

  await fs.mkdir(LANDING_MEDIA_ROOT, { recursive: true });
  await fs.writeFile(path.join(LANDING_MEDIA_ROOT, fileName), parsed.buffer);

  return `${MEDIA_PUBLIC_PREFIX}/landing/${fileName}`;
}

async function removeManagedMedia(publicUrl) {
  const absolutePath = resolveManagedMediaPath(publicUrl);
  if (!absolutePath) return;

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  MAX_IMAGE_BYTES,
  saveLandingMediaImage,
  removeManagedMedia
};
