export interface UserDocument {
  id: string;
  title: string;
  subtitle: string;
  rawText: string;
  sourceType: 'pdf' | 'text';
  pageCount?: number;
  fileName?: string;
  updatedAt: number;
  hasLinkedHandle?: boolean;
}

interface StoredRecord extends UserDocument {
  fileHandle?: FileSystemFileHandle;
}

const DB_NAME = 'codex_vecteur_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const LEGACY_LOCALSTORAGE_KEY = 'codex_vecteur_user_docs_v1';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllDocuments(): Promise<UserDocument[]> {
  try {
    const db = await openDB();
    const records = await new Promise<StoredRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredRecord[]) || []);
      req.onerror = () => reject(req.error);
    });

    // Migrate any legacy localStorage items seamlessly
    if (records.length === 0) {
      const legacyRaw = window.localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const migrated: UserDocument[] = parsed.map((d) => ({
              id: String(d.id || `doc-${Date.now()}`),
              title: String(d.title || 'Document'),
              subtitle: String(d.subtitle || 'Document source'),
              rawText: String(d.rawText || ''),
              sourceType: 'text',
              updatedAt: Date.now(),
            }));
            for (const doc of migrated) {
              await saveDocument(doc);
            }
            window.localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
            return migrated;
          }
        } catch {
          // ignore invalid legacy JSON
        }
      }
    }

    return records
      .map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        rawText: r.rawText,
        sourceType: r.sourceType || 'text',
        pageCount: r.pageCount,
        fileName: r.fileName,
        updatedAt: r.updatedAt || Date.now(),
        hasLinkedHandle: Boolean(r.fileHandle),
      }))
      .sort((a, b) => a.updatedAt - b.updatedAt);
  } catch {
    return [];
  }
}

export async function saveDocument(
  doc: UserDocument,
  fileHandle?: FileSystemFileHandle
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: StoredRecord = {
      ...doc,
      hasLinkedHandle: Boolean(fileHandle ?? doc.hasLinkedHandle),
      ...(fileHandle ? { fileHandle } : {}),
    };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function removeDocument(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getLinkedFileHandle(
  id: string
): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB();
    return await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = req.result as StoredRecord | undefined;
        resolve(res?.fileHandle ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export function supportsFileSystemAccess(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker ===
      'function'
  );
}
