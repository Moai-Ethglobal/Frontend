export type SessionMethod = "passkey" | "email" | "wallet";

export type Session = {
  id: string;
  method: SessionMethod;
  createdAt: string;
};

const STORAGE_KEY = "moai.session.v1";

function safeParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return safeParse<Session>(raw);
  } catch {
    return null;
  }
}

export function writeSession(value: Session | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!value) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function createSession(method: SessionMethod): Session {
  const session: Session = {
    id: globalThis.crypto?.randomUUID?.() ?? `${method}:${Date.now()}`,
    method,
    createdAt: new Date().toISOString(),
  };
  writeSession(session);
  return session;
}
