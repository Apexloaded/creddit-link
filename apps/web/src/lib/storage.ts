"use client";

import {
  STORAGE_DEFAULTS,
  StorageKey,
  StorageSchema,
} from "@/config";

const isServer = typeof window === "undefined";

export const storage = {
  get<K extends StorageKey>(key: K): StorageSchema[K] {
    if (isServer) return STORAGE_DEFAULTS[key];

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return STORAGE_DEFAULTS[key];
      return JSON.parse(item) as StorageSchema[K];
    } catch (error) {
      console.error(`[storage.get] Error reading key "${key}":`, error);
      return STORAGE_DEFAULTS[key];
    }
  },

  set<K extends StorageKey>(key: K, value: StorageSchema[K]): void {
    if (isServer) return;

    try {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);

      window.dispatchEvent(
        new CustomEvent("local-storage-update", {
          detail: { key, value },
        }),
      );
    } catch (error) {
      console.error(`[storage.set] Error writing key "${key}":`, error);
    }
  },

  remove<K extends StorageKey>(key: K): void {
    if (isServer) return;

    try {
      window.localStorage.removeItem(key);
      window.dispatchEvent(
        new CustomEvent("local-storage-update", {
          detail: { key, value: STORAGE_DEFAULTS[key] },
        }),
      );
    } catch (error) {
      console.error(`[storage.remove] Error removing key "${key}":`, error);
    }
  },

  clear(): void {
    if (isServer) return;

    try {
      window.localStorage.clear();
    } catch (error) {
      console.error("[storage.clear] Error clearing storage:", error);
    }
  },
};
