export type SessionMethod = "passkey" | "email" | "wallet";

export type Session = {
  id: string;
  method: SessionMethod;
  createdAt: string;
};

import { readJson, writeJson } from "./storage";

const STORAGE_KEY = "moai.session.v1";
const IDENTITY_KEY = "moai.identity.v1";

export function readSession(): Session | null {
  return readJson<Session>(STORAGE_KEY);
}

export function writeSession(value: Session | null): void {
  writeJson(STORAGE_KEY, value);
}

function getOrCreateIdentityId(): string {
  const existing = readJson<string>(IDENTITY_KEY);
  const trimmed = existing?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;

  const id = globalThis.crypto?.randomUUID?.() ?? `id:${Date.now()}`;
  writeJson(IDENTITY_KEY, id);
  return id;
}

export function createSessionWithId(
  method: SessionMethod,
  id: string,
): Session {
  const nextId = id.trim();
  const session: Session = {
    id: nextId.length > 0 ? nextId : `${method}:${Date.now()}`,
    method,
    createdAt: new Date().toISOString(),
  };
  writeSession(session);
  return session;
}

export function createSession(method: SessionMethod): Session {
  if (method === "wallet") {
    return createSessionWithId(
      method,
      globalThis.crypto?.randomUUID?.() ?? `${method}:${Date.now()}`,
    );
  }

  return createSessionWithId(method, getOrCreateIdentityId());
}
