export type InviteRecord = {
  code: string;
  moaiId: string;
  moaiName: string;
  createdBy?: string;
  createdAt: string;
  expiresAt: string;
};

export type FileRecord = {
  id: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
  createdAt: string;
};

export type NonceRecord = {
  nonce: string;
  address: string;
  roomId: string;
  message: string;
  issuedAt: string;
  expiresAt: string;
  used: boolean;
};

type Store = {
  invites: Record<string, InviteRecord>;
  files: Record<string, FileRecord>;
  nonces: Record<string, NonceRecord>;
};

function getGlobalStore(): Store {
  const g = globalThis as unknown as {
    __moaiStore?: Store;
  };
  if (!g.__moaiStore) {
    g.__moaiStore = { invites: {}, files: {}, nonces: {} };
  }
  return g.__moaiStore;
}

export function putInvite(invite: InviteRecord): void {
  const store = getGlobalStore();
  store.invites[invite.code] = invite;
}

export function getInvite(code: string): InviteRecord | null {
  const store = getGlobalStore();
  return store.invites[code] ?? null;
}

export function putFile(record: FileRecord): void {
  const store = getGlobalStore();
  store.files[record.id] = record;
}

export function getFile(id: string): FileRecord | null {
  const store = getGlobalStore();
  return store.files[id] ?? null;
}

export function putNonce(record: NonceRecord): void {
  const store = getGlobalStore();
  store.nonces[record.nonce] = record;
}

export function getNonce(nonce: string): NonceRecord | null {
  const store = getGlobalStore();
  return store.nonces[nonce] ?? null;
}

export function markNonceUsed(nonce: string): void {
  const store = getGlobalStore();
  const record = store.nonces[nonce];
  if (!record) return;
  record.used = true;
  store.nonces[nonce] = record;
}

export function consumeNonce(nonce: string): NonceRecord | null {
  const store = getGlobalStore();
  const record = store.nonces[nonce] ?? null;
  if (!record) return null;
  if (record.used) return null;
  record.used = true;
  store.nonces[nonce] = record;
  return record;
}
