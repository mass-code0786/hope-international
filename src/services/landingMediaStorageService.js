const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const env = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const APP_ROOT = path.resolve(__dirname, '../..');
const LEGACY_MEDIA_ROOT = path.join(APP_ROOT, 'storage');
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

function normalizePublicPrefix(value) {
  const normalized = String(value || '/media').trim();
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/media';
}

function normalizePublicBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeRelativePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .trim();
}

function isPathInside(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function isPathWithinRoot(rootPath, targetPath) {
  const relative = path.relative(rootPath, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

function getConfiguredMediaRoot() {
  const configured = String(env.mediaStorageRoot || '').trim();
  if (!configured) return '';
  return path.resolve(configured);
}

function getWritableMediaRoot() {
  const configured = getConfiguredMediaRoot();
  if (configured) return configured;
  if (env.nodeEnv !== 'production') return LEGACY_MEDIA_ROOT;
  return '';
}

function getPublicPrefix() {
  return normalizePublicPrefix(env.mediaPublicPath);
}

function getPublicBaseUrl() {
  return normalizePublicBaseUrl(env.mediaPublicBaseUrl);
}

function getPublicMountUrl(relativePath) {
  const safeRelativePath = normalizeRelativePath(relativePath);
  const publicBaseUrl = getPublicBaseUrl();
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${safeRelativePath}`;
  }
  return `${getPublicPrefix()}/${safeRelativePath}`;
}

function getStaticRoots() {
  const roots = [];
  const writableRoot = getWritableMediaRoot();
  if (writableRoot) roots.push(writableRoot);
  if (!roots.includes(LEGACY_MEDIA_ROOT)) roots.push(LEGACY_MEDIA_ROOT);
  return roots;
}

function assertPersistentStorageConfiguration() {
  const writableRoot = getWritableMediaRoot();
  if (!writableRoot) {
    throw new Error('MEDIA_STORAGE_ROOT must be set to a persistent server volume before starting production');
  }

  if (env.nodeEnv === 'production' && path.resolve(writableRoot) === path.resolve(LEGACY_MEDIA_ROOT)) {
    throw new Error('MEDIA_STORAGE_ROOT must point outside the app directory in production; the repo storage folder is ephemeral');
  }

  if (env.nodeEnv === 'production' && isPathInside(APP_ROOT, writableRoot)) {
    throw new Error('MEDIA_STORAGE_ROOT must point to a mounted persistent volume outside the deployed app directory');
  }
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

function extractManagedRelativePath(publicUrl) {
  const normalized = String(publicUrl || '').trim();
  if (!normalized) return null;

  const publicPrefix = getPublicPrefix();
  if (normalized.startsWith(`${publicPrefix}/`)) {
    return normalizeRelativePath(normalized.slice(publicPrefix.length + 1));
  }

  const publicBaseUrl = getPublicBaseUrl();
  if (publicBaseUrl && normalized.startsWith(`${publicBaseUrl}/`)) {
    return normalizeRelativePath(normalized.slice(publicBaseUrl.length + 1));
  }

  // Backward compatibility for legacy records saved with the original /media prefix.
  if (normalized.startsWith('/media/')) {
    return normalizeRelativePath(normalized.slice('/media/'.length));
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.pathname.startsWith(`${publicPrefix}/`)) {
      return normalizeRelativePath(parsed.pathname.slice(publicPrefix.length + 1));
    }
    if (parsed.pathname.startsWith('/media/')) {
      return normalizeRelativePath(parsed.pathname.slice('/media/'.length));
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function buildCandidateAbsolutePaths(relativePath) {
  if (!relativePath) return [];

  const roots = getStaticRoots();
  return roots
    .map((root) => path.resolve(root, relativePath))
    .filter((absolutePath, index, list) => {
      const parentRoot = roots[index];
      if (!parentRoot) return false;
      if (!isPathWithinRoot(path.resolve(parentRoot), absolutePath)) return false;
      return list.indexOf(absolutePath) === index;
    });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function getManagedMediaStatus(publicUrl) {
  const normalized = String(publicUrl || '').trim();
  if (!normalized) {
    return {
      isManaged: false,
      exists: false,
      relativePath: '',
      renderUrl: '',
      storageRoot: null
    };
  }

  const relativePath = extractManagedRelativePath(normalized);
  if (!relativePath) {
    return {
      isManaged: false,
      exists: true,
      relativePath: '',
      renderUrl: normalized,
      storageRoot: null
    };
  }

  const candidateRoots = getStaticRoots();
  for (let index = 0; index < candidateRoots.length; index += 1) {
    const root = candidateRoots[index];
    const absolutePath = path.resolve(root, relativePath);
    if (!isPathWithinRoot(path.resolve(root), absolutePath)) continue;
    if (await fileExists(absolutePath)) {
      return {
        isManaged: true,
        exists: true,
        relativePath,
        renderUrl: getPublicMountUrl(relativePath),
        storageRoot: root
      };
    }
  }

  return {
    isManaged: true,
    exists: false,
    relativePath,
    renderUrl: '',
    storageRoot: null
  };
}

async function resolveRenderableMediaUrl(publicUrl) {
  const status = await getManagedMediaStatus(publicUrl);
  return status.renderUrl;
}

async function saveLandingMediaImage(slotKey, imageDataUrl) {
  return saveManagedImage('landing', slotKey, imageDataUrl);
}

async function saveGalleryImage(itemKey, imageDataUrl) {
  return saveManagedImage('gallery', itemKey, imageDataUrl);
}

async function saveManagedImage(folderName, slotKey, imageDataUrl) {
  const writableRoot = getWritableMediaRoot();
  if (!writableRoot) {
    throw new ApiError(500, 'Persistent media storage is not configured');
  }

  const safeSlotKey = normalizeSlotKey(slotKey);
  if (!safeSlotKey) {
    throw new ApiError(400, 'Invalid landing media slot');
  }

  const parsed = parseImageDataUrl(imageDataUrl);
  const fileName = `${safeSlotKey}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${parsed.extension}`;
  const relativePath = normalizeRelativePath(path.posix.join(folderName, fileName));
  const targetAbsolutePath = path.resolve(writableRoot, relativePath);
  if (!isPathWithinRoot(path.resolve(writableRoot), targetAbsolutePath)) {
    throw new ApiError(400, 'Invalid landing media slot');
  }

  await fs.mkdir(path.dirname(targetAbsolutePath), { recursive: true });
  await fs.writeFile(targetAbsolutePath, parsed.buffer);

  return getPublicMountUrl(relativePath);
}

async function removeManagedMedia(publicUrl) {
  const relativePath = extractManagedRelativePath(publicUrl);
  if (!relativePath) return;

  const candidatePaths = buildCandidateAbsolutePaths(relativePath);
  for (const absolutePath of candidatePaths) {
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

module.exports = {
  LEGACY_MEDIA_ROOT,
  MAX_IMAGE_BYTES,
  assertPersistentStorageConfiguration,
  extractManagedRelativePath,
  getManagedMediaStatus,
  getPublicPrefix,
  getStaticRoots,
  resolveRenderableMediaUrl,
  saveLandingMediaImage,
  saveGalleryImage,
  removeManagedMedia
};
