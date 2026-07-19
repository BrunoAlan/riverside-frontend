'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Updater<T> = T | ((prev: T) => T);
type Listener = (value: unknown) => void;

/**
 * Instances sharing a key stay in sync: `sessionStorage` fires no event in the
 * tab that wrote it, so writers notify the other subscribers directly.
 */
const listeners = new Map<string, Set<Listener>>();

function subscribe(key: string, listener: Listener): () => void {
  const forKey = listeners.get(key) ?? new Set<Listener>();
  listeners.set(key, forKey);
  forKey.add(listener);
  return () => {
    forKey.delete(listener);
    if (forKey.size === 0) listeners.delete(key);
  };
}

export function useSessionStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value: Updater<T>) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed entries
    }
    return subscribe(key, (next) => setValue(next as T));
  }, [key]);

  const set = useCallback(
    (next: Updater<T>) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(valueRef.current) : next;
      valueRef.current = resolved;
      setValue(resolved);
      try {
        window.sessionStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // ignore quota / disabled storage
      }
      listeners.get(key)?.forEach((listener) => listener(resolved));
    },
    [key]
  );

  return [value, set];
}
