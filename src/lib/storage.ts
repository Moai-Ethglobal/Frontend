export function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const STORAGE_CHANGE_EVENT = "moai:storage";

export type StorageChangeDetail = {
  key: string;
};

function notifyStorageChanged(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<StorageChangeDetail>(STORAGE_CHANGE_EVENT, {
        detail: { key },
      }),
    );
  } catch {
    // ignore
  }
}

export function writeJson(key: string, value: unknown | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      notifyStorageChanged(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
    notifyStorageChanged(key);
  } catch {
    // ignore
  }
}
