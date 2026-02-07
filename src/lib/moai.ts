export type MoaiMember = {
  id: string;
  displayName: string;
  email?: string;
  role: "creator" | "member";
  joinedAt: string;
};

export type MyMoai = {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  members: MoaiMember[];
};

const STORAGE_KEY = "moai.myMoai.v1";

function safeParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readMyMoai(): MyMoai | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return safeParse<MyMoai>(raw);
  } catch {
    return null;
  }
}

export function writeMyMoai(value: MyMoai | null): void {
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

export function createMyMoai(input: {
  name: string;
  inviteCode: string;
  creator: { displayName: string; email?: string };
}): MyMoai {
  const now = new Date().toISOString();
  const id = globalThis.crypto?.randomUUID?.() ?? input.inviteCode;
  const creatorId = globalThis.crypto?.randomUUID?.() ?? `${id}:creator`;

  const moai: MyMoai = {
    id,
    name: input.name,
    inviteCode: input.inviteCode,
    createdAt: now,
    members: [
      {
        id: creatorId,
        displayName: input.creator.displayName,
        email: input.creator.email,
        role: "creator",
        joinedAt: now,
      },
    ],
  };

  writeMyMoai(moai);
  return moai;
}
