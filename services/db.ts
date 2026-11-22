import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'quran_offline_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

const getDB = () => {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('surahs')) {
          db.createObjectStore('surahs');
        }
        if (!db.objectStoreNames.contains('juzs')) {
          db.createObjectStore('juzs');
        }
        if (!db.objectStoreNames.contains('general')) {
          db.createObjectStore('general');
        }
        if (!db.objectStoreNames.contains('userData')) {
          db.createObjectStore('userData');
        }
      },
    });
  }
  return dbPromise;
};

export const dbService = {
  async get(store: 'surahs' | 'juzs' | 'general' | 'userData', key: string) {
    try {
      const db = await getDB();
      if (!db) return null;
      return await db.get(store, key);
    } catch (err) {
      console.warn(`IndexedDB get error (${store}/${key}):`, err);
      return null;
    }
  },

  async set(store: 'surahs' | 'juzs' | 'general' | 'userData', key: string, value: any) {
    try {
      const db = await getDB();
      if (!db) return null;
      return await db.put(store, value, key);
    } catch (err) {
      console.warn(`IndexedDB set error (${store}/${key}):`, err);
      return null;
    }
  },

  async delete(store: 'surahs' | 'juzs' | 'general' | 'userData', key: string) {
    try {
      const db = await getDB();
      return await db.delete(store, key);
    } catch (err) {
      console.warn(`IndexedDB delete error (${store}/${key}):`, err);
      return null;
    }
  },

  async clear(store: 'surahs' | 'juzs' | 'general' | 'userData') {
    try {
      const db = await getDB();
      return await db.clear(store);
    } catch (err) {
      console.warn(`IndexedDB clear error (${store}):`, err);
      return null;
    }
  },

  async count(store: 'surahs' | 'juzs' | 'general' | 'userData'): Promise<number> {
    try {
      const db = await getDB();
      return await db.count(store);
    } catch (err) {
      return 0;
    }
  },

  // High-reliability User Data Persistence (Syncs to both IndexedDB and LocalStorage)
  async saveUserData<T>(key: string, data: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`LocalStorage write failed for ${key}`, e);
    }
    await this.set('userData', key, data);
  },

  async getUserData<T>(key: string, defaultValue: T): Promise<T> {
    // 1. Fast read from localStorage
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`LocalStorage read failed for ${key}`, e);
    }

    // 2. Fallback read from IndexedDB
    const idbData = await this.get('userData', key);
    if (idbData !== null && idbData !== undefined) {
      try {
        localStorage.setItem(key, JSON.stringify(idbData));
      } catch (_) {}
      return idbData;
    }

    return defaultValue;
  }
};
