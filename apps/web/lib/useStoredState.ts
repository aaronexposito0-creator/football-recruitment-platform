"use client";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

/** Local, explicitly labelled user choices. Never store football observations here.
 * Read each key independently and never overwrite a failed read on hydration.
 * A null key keeps uploads/scenarios exclusively in this tab's memory.
 */
export function useStoredState<T>(
  key: string | null,
  initial: T,
  parse: (raw: string) => T,
) {
  const [value, setValue] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState<string | null | undefined>(
    undefined,
  );
  const [dirty, setDirty] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    setDirty(false);
    setStorageError(false);
    try {
      const raw = key ? localStorage.getItem(key) : null;
      setValue(raw === null ? initial : parse(raw));
    } catch {
      setValue(initial);
      setStorageError(true);
    }
    setLoadedKey(key);
    // Loading is tied to the storage key, not to changing object identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (key === null || loadedKey !== key || !dirty) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [key, loadedKey, dirty, value]);
  const update: Dispatch<SetStateAction<T>> = useCallback((next) => {
    setValue(next);
    setDirty(true);
  }, []);
  return [value, update, { ready: loadedKey === key, storageError }] as const;
}
