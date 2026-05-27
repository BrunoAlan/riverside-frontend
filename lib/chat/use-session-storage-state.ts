'use client';

import { useCallback, useEffect, useState } from 'react';

type Updater<T> = T | ((prev: T) => T);

export function useSessionStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value: Updater<T>) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed entries
    }
  }, [key]);

  const set = useCallback(
    (next: Updater<T>) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.sessionStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // ignore quota / disabled storage
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set];
}
