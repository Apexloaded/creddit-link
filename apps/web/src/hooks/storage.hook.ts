"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STORAGE_DEFAULTS,
  StorageKey,
  StorageSchema,
} from "@/config/storage.config";
import { storage } from "@/lib/storage";

export function useStorage<K extends StorageKey>(key: K) {
  const [value, setValue] = useState<StorageSchema[K]>(STORAGE_DEFAULTS[key]);

  useEffect(() => {
    setValue(storage.get(key));
  }, [key]);

  const setStoredValue = useCallback(
    (
      newValue:
        | StorageSchema[K]
        | ((val: StorageSchema[K]) => StorageSchema[K]),
    ) => {
      setValue((current) => {
        const valueToStore =
          newValue instanceof Function ? newValue(current) : newValue;
        storage.set(key, valueToStore);
        return valueToStore;
      });
    },
    [key],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event: StorageEvent | CustomEvent) => {
      if ("key" in event && event.key !== key) return;
      if ("detail" in event && (event as CustomEvent).detail.key !== key)
        return;

      setValue(storage.get(key));
    };

    window.addEventListener("storage", handleStorageChange as EventListener);
    window.addEventListener(
      "local-storage-update",
      handleStorageChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange as EventListener,
      );
      window.removeEventListener(
        "local-storage-update",
        handleStorageChange as EventListener,
      );
    };
  }, [key]);

  return [value, setStoredValue] as const;
}
