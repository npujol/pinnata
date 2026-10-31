import type { Conversation } from './models';

const DB = 'pi-pocket';
const STORE = 'conversations';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode); const req = run(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close(); tx.onerror = () => reject(tx.error);
  });
}
export const listConversations = async (): Promise<Conversation[]> => (await transact('readonly', s => s.getAll())) as Conversation[];
export const saveConversation = (conversation: Conversation): Promise<IDBValidKey> => transact('readwrite', s => s.put(conversation));
export const deleteConversation = (id: string): Promise<undefined> => transact('readwrite', s => s.delete(id));

const attachmentDb = 'pi-pocket-attachments';
function openAttachments(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(attachmentDb, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
export async function saveImage(blob: Blob): Promise<string> {
  const db = await openAttachments(); const id = crypto.randomUUID();
  await new Promise<void>((resolve, reject) => { const req = db.transaction('images', 'readwrite').objectStore('images').put(blob, id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  db.close(); return id;
}
export async function getImage(id: string): Promise<Blob | undefined> {
  const db = await openAttachments();
  const result = await new Promise<Blob | undefined>((resolve, reject) => { const req = db.transaction('images', 'readonly').objectStore('images').get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  db.close(); return result;
}
export async function removeImages(ids: string[]): Promise<void> {
  const db = await openAttachments(); const tx = db.transaction('images', 'readwrite'); const store = tx.objectStore('images'); ids.forEach(id => store.delete(id));
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
}
