import type { EncryptedPrivateKeyPayload } from "../crypto/keys";

export interface StoredPrivateKeyRecord extends EncryptedPrivateKeyPayload {
  userId: string;
  publicKey: JsonWebKey;
  createdAt: string;
}

const DB_NAME = "encrypted-chat";
const DB_VERSION = 1;
const STORE_NAME = "privateKeys";

export async function savePrivateKeyRecord(record: StoredPrivateKeyRecord): Promise<void> {
  const db = await openDb();
  await runStoreRequest(db, "readwrite", (store) => store.put(record));
  db.close();
}

export async function getPrivateKeyRecord(userId: string): Promise<StoredPrivateKeyRecord | undefined> {
  const db = await openDb();
  const record = await runStoreRequest<StoredPrivateKeyRecord | undefined>(db, "readonly", (store) => store.get(userId));
  db.close();
  return record;
}

export async function deletePrivateKeyRecord(userId: string): Promise<void> {
  const db = await openDb();
  await runStoreRequest(db, "readwrite", (store) => store.delete(userId));
  db.close();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };
  });
}

function runStoreRequest<T = unknown>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}
