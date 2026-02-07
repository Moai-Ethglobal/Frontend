export type MemberStatus = "active" | "past";
export type MemberPastReason = "awol" | "demise";

export type MoaiMember = {
  id: string;
  displayName: string;
  email?: string;
  role: "creator" | "member";
  joinedAt: string;
  status?: MemberStatus;
  pastReason?: MemberPastReason;
  pastAt?: string;
};

export type MyMoai = {
  id: string;
  name: string;
  inviteCode: string;
  monthlyContributionUSDC?: string;
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
  monthlyContributionUSDC?: string;
  creatorId?: string;
  creator: { displayName: string; email?: string };
}): MyMoai {
  const now = new Date().toISOString();
  const id = globalThis.crypto?.randomUUID?.() ?? input.inviteCode;
  const creatorIdRaw = input.creatorId?.trim();
  const creatorId =
    creatorIdRaw && creatorIdRaw.length > 0
      ? creatorIdRaw
      : (globalThis.crypto?.randomUUID?.() ?? `${id}:creator`);
  const monthlyContributionUSDC = input.monthlyContributionUSDC?.trim();

  const moai: MyMoai = {
    id,
    name: input.name,
    inviteCode: input.inviteCode,
    monthlyContributionUSDC:
      monthlyContributionUSDC && monthlyContributionUSDC.length > 0
        ? monthlyContributionUSDC
        : undefined,
    createdAt: now,
    members: [
      {
        id: creatorId,
        displayName: input.creator.displayName,
        email: input.creator.email,
        role: "creator",
        joinedAt: now,
        status: "active",
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
  memberId?: string;
  member: { displayName: string; email?: string };
}): { ok: true; moai: MyMoai } | { ok: false; error: JoinMyMoaiError } {
  const moai = readMyMoai();
  if (!moai) return { ok: false, error: "NO_MOAI" };
  if (moai.inviteCode !== input.inviteCode)
    return { ok: false, error: "CODE_MISMATCH" };

  const memberIdRaw = input.memberId?.trim();
  const memberId =
    memberIdRaw && memberIdRaw.length > 0 ? memberIdRaw : undefined;

  const displayName = input.member.displayName.trim();
  const email = input.member.email?.trim();
  const normalizedEmail = email ? email.toLowerCase() : undefined;

  if (displayName.length === 0) return { ok: false, error: "INVALID_MEMBER" };
  if (moai.members.length >= MAX_MEMBERS) return { ok: false, error: "FULL" };

  if (memberId && moai.members.some((m) => m.id === memberId)) {
    return { ok: false, error: "ALREADY_JOINED" };
  }

  if (
    normalizedEmail &&
    moai.members.some(
      (m) => (m.email ? m.email.toLowerCase() : undefined) === normalizedEmail,
    )
  ) {
    return { ok: false, error: "ALREADY_JOINED" };
  }

  const now = new Date().toISOString();
  const id =
    memberId ?? globalThis.crypto?.randomUUID?.() ?? `${moai.id}:${now}`;

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
        status: "active",
      },
    ],
  };

  writeMyMoai(next);
  return { ok: true, moai: next };
}

export function isMemberActive(member: MoaiMember): boolean {
  return member.status !== "past";
}

export function listActiveMembers(moai: MyMoai): MoaiMember[] {
  return moai.members.filter(isMemberActive);
}

export function isActiveMemberId(moai: MyMoai, memberId: string): boolean {
  const id = memberId.trim();
  if (!id.length) return false;
  return moai.members.some((m) => m.id === id && isMemberActive(m));
}

export type MarkMemberPastError = "NO_MOAI" | "ID_MISMATCH" | "NOT_FOUND";

export function markMemberPast(input: {
  moaiId: string;
  memberId: string;
  reason: MemberPastReason;
}):
  | { ok: true; moai: MyMoai; member: MoaiMember }
  | { ok: false; error: MarkMemberPastError } {
  const moai = readMyMoai();
  if (!moai) return { ok: false, error: "NO_MOAI" };
  if (moai.id !== input.moaiId) return { ok: false, error: "ID_MISMATCH" };

  const memberId = input.memberId.trim();
  const idx = moai.members.findIndex((m) => m.id === memberId);
  if (idx < 0) return { ok: false, error: "NOT_FOUND" };

  const current = moai.members[idx];
  const member: MoaiMember = {
    ...current,
    status: "past",
    pastReason: input.reason,
    pastAt: new Date().toISOString(),
  };

  const next: MyMoai = {
    ...moai,
    members: [
      ...moai.members.slice(0, idx),
      member,
      ...moai.members.slice(idx + 1),
    ],
  };

  writeMyMoai(next);
  return { ok: true, moai: next, member };
}

export type SetMonthlyContributionError =
  | "NO_MOAI"
  | "ID_MISMATCH"
  | "INVALID_AMOUNT";

export function setMonthlyContributionUSDC(input: {
  moaiId: string;
  monthlyContributionUSDC: string;
}):
  | { ok: true; moai: MyMoai }
  | { ok: false; error: SetMonthlyContributionError } {
  const moai = readMyMoai();
  if (!moai) return { ok: false, error: "NO_MOAI" };
  if (moai.id !== input.moaiId) return { ok: false, error: "ID_MISMATCH" };

  const value = input.monthlyContributionUSDC.trim();
  if (!value.length) return { ok: false, error: "INVALID_AMOUNT" };

  const next: MyMoai = { ...moai, monthlyContributionUSDC: value };
  writeMyMoai(next);
  return { ok: true, moai: next };
}
