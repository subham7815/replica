import type { KeyValueStorage } from '@newreplica/shared/auth';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const storage: KeyValueStorage = {
  async get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage unavailable (private mode); session lasts for this tab only
    }
  },
  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
