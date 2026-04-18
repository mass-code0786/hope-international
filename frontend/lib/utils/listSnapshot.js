'use client';

const LIST_SNAPSHOT_PREFIX = 'hope:list-snapshot:';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function getStorageKey(key) {
  return `${LIST_SNAPSHOT_PREFIX}${String(key || '')}`;
}

export function readListSnapshot(key, options = {}) {
  if (!canUseStorage()) return null;

  const maxAgeMs = Number(options.maxAgeMs || 0);
  const storageKey = getStorageKey(key);

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    const savedAt = Number(parsed.savedAt || 0);
    if (maxAgeMs > 0 && (!savedAt || (Date.now() - savedAt) > maxAgeMs)) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return parsed.data ?? null;
  } catch (_error) {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

export function writeListSnapshot(key, data) {
  if (!canUseStorage() || data == null) return data;

  try {
    window.sessionStorage.setItem(getStorageKey(key), JSON.stringify({
      savedAt: Date.now(),
      data
    }));
  } catch (_error) {
    // Ignore storage quota and serialization failures.
  }

  return data;
}
