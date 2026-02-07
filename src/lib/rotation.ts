import type { MoaiMember, MyMoai } from "./moai";

function monthIndex(month: string): number | null {
  const [yRaw, mRaw] = month.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  if (m < 1 || m > 12) return null;
  return y * 12 + (m - 1);
}

function monthFromIso(iso: string): string | null {
  const month = iso.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

function sortMembersByJoinTime(members: MoaiMember[]): MoaiMember[] {
  return [...members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export function rotationOrder(moai: MyMoai): MoaiMember[] {
  return sortMembersByJoinTime(moai.members);
}

export function rotationNextMember(
  moai: MyMoai,
  month: string,
): MoaiMember | null {
  const startMonth = monthFromIso(moai.createdAt);
  const orderedMembers = rotationOrder(moai);
  if (!startMonth) return null;
  if (orderedMembers.length === 0) return null;

  const currentIdx = monthIndex(month);
  const startIdx = monthIndex(startMonth);
  if (currentIdx === null || startIdx === null) return null;

  const delta = Math.max(0, currentIdx - startIdx);
  const idx = delta % orderedMembers.length;
  return orderedMembers[idx] ?? null;
}
