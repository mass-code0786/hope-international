const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const env = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const APP_ROOT = path.resolve(__dirname, '../..');
const LEGACY_MEDIA_ROOT = path.join(APP_ROOT, 'storage');
const MEDIA_SUBDIRECTORIES = ['landing', 'gallery', 'uploads'];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const IMAGE_MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};
const UPLOAD_MIME_TO_EXTENSION = {
  ...IMAGE_MIME_TO_EXTENSION,
  'application/pdf': 'pdf'
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
  if (!path.isAbsolute(configured)) {
    throw new Error(`MEDIA_STORAGE_ROOT must be an absolute path. Received: ${configured}`);
  }
  return path.normalize(configured);
}

function getRailwayMediaRoot() {
  const configured = String(env.railwayVolumeMountPath || '').trim();
  if (!configured) return '';
  if (!path.isAbsolute(configured)) {
    throw new Error(`RAILWAY_VOLUME_MOUNT_PATH must be an absolute path. Received: ${configured}`);
  }
  return path.join(path.normalize(configured), 'hope-international', 'media');
}

function getWritableMediaRoot() {
  const configured = getConfiguredMediaRoot();
  if (configured) return configured;
  const railwayRoot = getRailwayMediaRoot();
  if (railwayRoot) return railwayRoot;
  return LEGACY_MEDIA_ROOT;
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

function getProductionStorageHelpText() {
  const railwayExample = '/app/data';
  const renderExample = '/var/data/hope-international/media';
  return [
    'Persistent media storage is required in production.',
    'Storage root resolution order is MEDIA_STORAGE_ROOT, then RAILWAY_VOLUME_MOUNT_PATH, then a dev-only local fallback.',
    `On Railway, attach a volume and the app will automatically use RAILWAY_VOLUME_MOUNT_PATH=${railwayExample} to store media under hope-international/media.`,
    'If you are not on Railway, set MEDIA_STORAGE_ROOT to the absolute mount path of your persistent disk or server volume.',
    `Example for Render with a disk mounted at /var/data: MEDIA_STORAGE_ROOT=${renderExample}`,
    `Configured media directories will be created automatically under the resolved storage root: ${MEDIA_SUBDIRECTORIES.join(', ')}`
  ].join(' ');
}

function getMediaStorageMode() {
  const configured = getConfiguredMediaRoot();
  if (configured) {
    return {
      root: configured,
      mode: 'persistent-explicit',
      warning: ''
    };
  }

  const railwayRoot = getRailwayMediaRoot();
  if (railwayRoot) {
    return {
      root: railwayRoot,
      mode: 'persistent-railway',
      warning: ''
    };
  }

  return {
    root: LEGACY_MEDIA_ROOT,
    mode: 'local-fallback',
    warning: `Persistent media storage is not configured. Falling back to local filesystem storage at ${LEGACY_MEDIA_ROOT}. Uploaded files will work for testing, but may disappear after deploy, restart, or container rebuild. ${getProductionStorageHelpText()}`
  };
}

async function ensureMediaStorageReady() {
  const storage = getMediaStorageMode();
  const writableRoot = storage.root;
  await fs.mkdir(writableRoot, { recursive: true });
  await Promise.all(
    MEDIA_SUBDIRECTORIES.map((directoryName) => fs.mkdir(path.join(writableRoot, directoryName), { recursive: true }))
  );

  return {
    root: writableRoot,
    mode: storage.mode,
    warning: storage.warning,
    publicPrefix: getPublicPrefix(),
    publicBaseUrl: getPublicBaseUrl(),
    directories: MEDIA_SUBDIRECTORIES.slice()
  };
}

function parseDataUrl(dataUrl, options = {}) {
  const normalized = String(dataUrl || '').trim();
  const match = normalized.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  const allowedMimeToExtension = options.allowedMimeToExtension || IMAGE_MIME_TO_EXTENSION;
  const unsupportedMessage = options.unsupportedMessage || 'Only JPG, PNG, and WEBP image uploads are supported';
  if (!match || !allowedMimeToExtension[match[1]]) throw new ApiError(400, unsupportedMessage);

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) {
    throw new ApiError(400, 'Uploaded image is empty');
  }
  const maxBytes = Number(options.maxBytes || MAX_IMAGE_BYTES);
  if (buffer.length > maxBytes) {
    throw new ApiError(400, options.maxSizeMessage || 'Uploaded image must be 3MB or smaller');
  }

  return {
    mimeType,
    extension: allowedMimeToExtension[mimeType],
    buffer
  };
}

function parseImageDataUrl(dataUrl) {
  return parseDataUrl(dataUrl, {
    allowedMimeToExtension: IMAGE_MIME_TO_EXTENSION,
    maxBytes: MAX_IMAGE_BYTES,
    unsupportedMessage: 'Only JPG, PNG, and WEBP image uploads are supported',
    maxSizeMessage: 'Uploaded image must be 3MB or smaller'
  });
}

function parseUploadDataUrl(dataUrl) {
  return parseDataUrl(dataUrl, {
    allowedMimeToExtension: UPLOAD_MIME_TO_EXTENSION,
    maxBytes: MAX_UPLOAD_BYTES,
    unsupportedMessage: 'Only JPG, PNG, WEBP, and PDF uploads are supported',
    maxSizeMessage: 'Uploaded file must be 3MB or smaller'
  });
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

async function saveUploadFile(slotKey, fileDataUrl) {
  const writableRoot = getWritableMediaRoot();
  if (!writableRoot) {
    throw new ApiError(500, 'Persistent media storage is not configured');
  }

  const safeSlotKey = normalizeSlotKey(slotKey);
  if (!safeSlotKey) {
    throw new ApiError(400, 'Invalid upload slot');
  }

  const parsed = parseUploadDataUrl(fileDataUrl);
  const fileName = `${safeSlotKey}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${parsed.extension}`;
  const relativePath = normalizeRelativePath(path.posix.join('uploads', fileName));
  const targetAbsolutePath = path.resolve(writableRoot, relativePath);
  if (!isPathWithinRoot(path.resolve(writableRoot), targetAbsolutePath)) {
    throw new ApiError(400, 'Invalid upload slot');
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
  MEDIA_SUBDIRECTORIES,
  ensureMediaStorageReady,
  extractManagedRelativePath,
  getManagedMediaStatus,
  getMediaStorageMode,
  getPublicPrefix,
  getStaticRoots,
  resolveRenderableMediaUrl,
  saveUploadFile,
  saveLandingMediaImage,
  saveGalleryImage,
  removeManagedMedia
};
