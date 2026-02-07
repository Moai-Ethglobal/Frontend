import { readJson, writeJson } from "./storage";

export type Meeting = {
  id: string;
  moaiId: string;
  month: string;
  scheduledAt: string;
  attendanceByVoterId: Record<string, string>;
};

const STORAGE_KEY = "moai.meetings.v1";

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `mtg:${Date.now()}`;
}

function defaultScheduledAt(month: string): string {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const m = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(m))
    return new Date().toISOString();
  return new Date(Date.UTC(year, m - 1, 15, 18, 0, 0)).toISOString();
}

function readAll(): Meeting[] {
  return readJson<Meeting[]>(STORAGE_KEY) ?? [];
}

function writeAll(value: Meeting[]): void {
  writeJson(STORAGE_KEY, value);
}

export function getMeeting(moaiId: string, month: string): Meeting | null {
  return (
    readAll().find((m) => m.moaiId === moaiId && m.month === month) ?? null
  );
}

export function ensureMeeting(moaiId: string, month: string): Meeting {
  const all = readAll();
  const existing = all.find((m) => m.moaiId === moaiId && m.month === month);
  if (existing) return existing;

  const meeting: Meeting = {
    id: makeId(),
    moaiId,
    month,
    scheduledAt: defaultScheduledAt(month),
    attendanceByVoterId: {},
  };

  writeAll([meeting, ...all]);
  return meeting;
}

export function checkInMeeting(input: {
  moaiId: string;
  month: string;
  voterId: string;
}): Meeting {
  const all = readAll();
  const current =
    all.find((m) => m.moaiId === input.moaiId && m.month === input.month) ??
    ({
      id: makeId(),
      moaiId: input.moaiId,
      month: input.month,
      scheduledAt: defaultScheduledAt(input.month),
      attendanceByVoterId: {},
    } satisfies Meeting);

  const now = new Date().toISOString();
  const next: Meeting = {
    ...current,
    attendanceByVoterId: {
      ...current.attendanceByVoterId,
      [input.voterId]: now,
    },
  };

  writeAll([
    next,
    ...all.filter(
      (m) => !(m.moaiId === input.moaiId && m.month === input.month),
    ),
  ]);

  return next;
}

export function hasCheckedIn(input: {
  moaiId: string;
  month: string;
  voterId: string;
}): boolean {
  const meeting = getMeeting(input.moaiId, input.month);
  return Boolean(meeting?.attendanceByVoterId[input.voterId]);
}
