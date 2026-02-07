export type SessionMethod = "passkey" | "email" | "wallet";

export type Session = {
  id: string;
  method: SessionMethod;
  createdAt: string;
};

import { readJson, writeJson } from "./storage";

const STORAGE_KEY = "moai.session.v1";

export function readSession(): Session | null {
  return readJson<Session>(STORAGE_KEY);
}

export function writeSession(value: Session | null): void {
  writeJson(STORAGE_KEY, value);
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
