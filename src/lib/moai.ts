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

import { readJson, writeJson } from "./storage";

const STORAGE_KEY = "moai.myMoai.v1";
const MAX_MEMBERS = 10;

export function readMyMoai(): MyMoai | null {
  return readJson<MyMoai>(STORAGE_KEY);
}

export function writeMyMoai(value: MyMoai | null): void {
  writeJson(STORAGE_KEY, value);
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

export type JoinMyMoaiError =
  | "NO_MOAI"
  | "CODE_MISMATCH"
  | "INVALID_MEMBER"
  | "FULL"
  | "ALREADY_JOINED";

export function joinMyMoaiByInviteCode(input: {
  inviteCode: string;
  member: { displayName: string; email?: string };
}): { ok: true; moai: MyMoai } | { ok: false; error: JoinMyMoaiError } {
  const moai = readMyMoai();
  if (!moai) return { ok: false, error: "NO_MOAI" };
  if (moai.inviteCode !== input.inviteCode)
    return { ok: false, error: "CODE_MISMATCH" };

  const displayName = input.member.displayName.trim();
  const email = input.member.email?.trim();
  const normalizedEmail = email ? email.toLowerCase() : undefined;

  if (displayName.length === 0) return { ok: false, error: "INVALID_MEMBER" };
  if (moai.members.length >= MAX_MEMBERS) return { ok: false, error: "FULL" };

  if (
    normalizedEmail &&
    moai.members.some(
      (m) => (m.email ? m.email.toLowerCase() : undefined) === normalizedEmail,
    )
  ) {
    return { ok: false, error: "ALREADY_JOINED" };
  }

  const now = new Date().toISOString();
  const id = globalThis.crypto?.randomUUID?.() ?? `${moai.id}:${now}`;

  const next: MyMoai = {
    ...moai,
    members: [
      ...moai.members,
      {
        id,
        displayName,
        email: normalizedEmail,
        role: "member",
        joinedAt: now,
      },
    ],
  };

  writeMyMoai(next);
  return { ok: true, moai: next };
}
