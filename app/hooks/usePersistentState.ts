import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const STORAGE_PREFIX = "mabar_data:";

function readStoredValue<T>(key: string): T | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * Sama seperti useState, tapi nilainya disimpan ke localStorage sehingga
 * tidak hilang saat halaman di-refresh atau dibuka ulang.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stored = readStoredValue<T>(key);
    if (stored !== undefined) return stored;
    return typeof initialValue === "function"
      ? (initialValue as () => T)()
      : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      // localStorage penuh atau tidak tersedia — data tetap hidup di state
    }
  }, [key, value]);

  return [value, setValue];
}

/** Hapus semua data mabar yang tersimpan (dipakai saat logout / sesi habis). */
export function clearPersistentState(): void {
  if (typeof localStorage === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}
