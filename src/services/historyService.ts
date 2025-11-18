import type { GenerationHistoryItem } from '../types';

const DB_NAME = 'EVS_DB';
const STORE_NAME = 'history';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveHistoryItem = async (item: GenerationHistoryItem): Promise<void> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
  } catch (error) {
      console.error("Failed to save to IndexedDB", error);
      throw error;
  }
};

export const getHistory = async (): Promise<GenerationHistoryItem[]> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const result = request.result as GenerationHistoryItem[];
            // Sort by timestamp descending
            result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(result);
        };
        request.onerror = () => reject(request.error);
      });
  } catch (error) {
      console.error("Failed to get history from IndexedDB", error);
      return [];
  }
};

export const deleteHistoryItemId = async (id: string): Promise<void> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
  } catch (error) {
      console.error("Failed to delete from IndexedDB", error);
      throw error;
  }
};
