/**
 * IndexedDB helpers for LanguagePack metadata storage.
 *
 * Database: aurora-language-packs
 * Object store: packs (keyPath: "code")
 */

const DB_NAME = "aurora-language-packs";
const STORE_NAME = "packs";
const CACHE_NAME = "aurora-language-packs";
const DB_VERSION = 1;

/**
 * Metadata record for a cached Tesseract.js language pack.
 */
export interface LanguagePackRecord {
  /** ISO 639-1/Tesseract language code (e.g. "eng", "ind") */
  code: string;
  /** Human-readable language name (e.g. "English", "Indonesian") */
  name: string;
  /** Approximate size of the cached assets in bytes */
  size: number;
  /** Unix timestamp (ms) when the pack was cached */
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "code" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all stored LanguagePack metadata records.
 */
export async function getLanguagePackMetadata(): Promise<LanguagePackRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as LanguagePackRecord[]);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Inserts or updates a LanguagePack metadata record.
 */
export async function upsertLanguagePackMetadata(
  record: LanguagePackRecord,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Deletes a LanguagePack metadata record by language code.
 */
export async function deleteLanguagePackMetadata(code: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(code);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Returns true if a LanguagePack with the given code exists in IndexedDB.
 */
export async function isLanguagePackCached(code: string): Promise<boolean> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(code);

    request.onsuccess = () => {
      resolve(request.result !== undefined);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Deletes a LanguagePack from both the Cache API and IndexedDB.
 *
 * Removes all cache entries whose URL contains the language code from the
 * `aurora-language-packs` cache, then removes the IndexedDB metadata record.
 */
export async function deleteLanguagePack(code: string): Promise<void> {
  // Remove from Cache API
  if ("caches" in globalThis) {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const deletions = keys
      .filter((req) => req.url.includes(code))
      .map((req) => cache.delete(req));
    await Promise.all(deletions);
  }

  // Remove from IndexedDB
  await deleteLanguagePackMetadata(code);
}
