/**
 * CareConnect Ethiopia - Safe Storage Utility
 * Provides safe access to window.localStorage with error handling and in-memory fallback for SSR/tests.
 */

const memoryStore = new Map();

export const storage = {
  get(key, defaultValue = null) {
    if (typeof window === 'undefined') {
      return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch {
      try {
        return window.localStorage.getItem(key) || defaultValue;
      } catch {
        return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
      }
    }
  },

  set(key, value) {
    if (typeof window === 'undefined') {
      memoryStore.set(key, value);
      return;
    }
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn(`[CareConnect Storage] Failed to set item "${key}":`, e);
      memoryStore.set(key, value);
    }
  },

  remove(key) {
    if (typeof window === 'undefined') {
      memoryStore.delete(key);
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },

  clear() {
    if (typeof window === 'undefined') {
      memoryStore.clear();
      return;
    }
    try {
      window.localStorage.clear();
    } catch {
      memoryStore.clear();
    }
  }
};

export default storage;
