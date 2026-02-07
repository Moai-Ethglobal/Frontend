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

type Store = {
  invites: Record<string, InviteRecord>;
  files: Record<string, FileRecord>;
};

function getGlobalStore(): Store {
  const g = globalThis as unknown as {
    __moaiStore?: Store;
  };
  if (!g.__moaiStore) {
    g.__moaiStore = { invites: {}, files: {} };
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
