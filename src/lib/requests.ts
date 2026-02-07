import { readJson, writeJson } from "./storage";

export type RequestStatus = "open" | "passed" | "rejected" | "expired";
export type VoteChoice = "yes" | "no";

export type EmergencyWithdrawalRequest = {
  id: string;
  moaiId: string;
  type: "emergency_withdrawal";
  title: string;
  description: string;
  beneficiaryName: string;
  amountUSDC: string;
  status: RequestStatus;
  executedAt?: string;
  executedByVoterId?: string;
  executionReceiptId?: string;
  createdAt: string;
  expiresAt: string;
  votes: { yes: number; no: number };
  votesByVoterId?: Record<string, VoteChoice>;
};

export type ContributionChangeRequest = {
  id: string;
  moaiId: string;
  type: "change_contribution";
  title: string;
  description: string;
  newContributionUSDC: string;
  status: RequestStatus;
  createdAt: string;
  expiresAt: string;
  votes: { yes: number; no: number };
  votesByVoterId?: Record<string, VoteChoice>;
};

export type MoaiRequest =
  | EmergencyWithdrawalRequest
  | ContributionChangeRequest;

export type CreateRequestInput =
  | Omit<
      EmergencyWithdrawalRequest,
      | "id"
      | "status"
      | "createdAt"
      | "expiresAt"
      | "votes"
      | "votesByVoterId"
      | "executedAt"
      | "executedByVoterId"
      | "executionReceiptId"
    >
  | Omit<
      ContributionChangeRequest,
      "id" | "status" | "createdAt" | "expiresAt" | "votes" | "votesByVoterId"
    >;

const STORAGE_KEY = "moai.requests.v1";

function nowIso(): { createdAt: string; expiresAt: string } {
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + 1);
  return { createdAt: now.toISOString(), expiresAt: expires.toISOString() };
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `req:${Date.now()}`;
}

function readAll(): MoaiRequest[] {
  return readJson<MoaiRequest[]>(STORAGE_KEY) ?? [];
}

function writeAll(value: MoaiRequest[]): void {
  writeJson(STORAGE_KEY, value);
}

export function listRequestsByMoaiId(moaiId: string): MoaiRequest[] {
  return readAll()
    .filter((r) => r.moaiId === moaiId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRequestById(requestId: string): MoaiRequest | null {
  return readAll().find((r) => r.id === requestId) ?? null;
}

export function votesNeeded(memberCount: number): number {
  return Math.floor(memberCount / 2) + 1;
}

export function requestTypeLabel(type: MoaiRequest["type"]): string {
  return type === "emergency_withdrawal"
    ? "Emergency withdrawal"
    : "Contribution change";
}

export function createRequest(input: CreateRequestInput): MoaiRequest {
  const { createdAt, expiresAt } = nowIso();

  const base = {
    id: makeId(),
    moaiId: input.moaiId,
    title: input.title.trim(),
    description: input.description.trim(),
    status: "open" as const,
    createdAt,
    expiresAt,
    votes: { yes: 0, no: 0 },
    votesByVoterId: {},
  };

  const request: MoaiRequest =
    input.type === "emergency_withdrawal"
      ? {
          ...base,
          type: "emergency_withdrawal",
          beneficiaryName: input.beneficiaryName.trim(),
          amountUSDC: input.amountUSDC.trim(),
        }
      : {
          ...base,
          type: "change_contribution",
          newContributionUSDC: input.newContributionUSDC.trim(),
        };

  writeAll([request, ...readAll()]);
  return request;
}

export type VoteRequestError =
  | "NOT_FOUND"
  | "NOT_OPEN"
  | "EXPIRED"
  | "INVALID_CONTEXT"
  | "INVALID_VOTER";

export function voteRequestById(input: {
  requestId: string;
  choice: VoteChoice;
  voterId: string;
  memberCount: number;
}):
  | { ok: true; request: MoaiRequest }
  | { ok: false; error: VoteRequestError } {
  const memberCount = Math.floor(input.memberCount);
  if (!Number.isFinite(memberCount) || memberCount <= 0) {
    return { ok: false, error: "INVALID_CONTEXT" };
  }
  if (input.voterId.trim().length === 0)
    return { ok: false, error: "INVALID_VOTER" };

  const all = readAll();
  const idx = all.findIndex((r) => r.id === input.requestId);
  if (idx < 0) return { ok: false, error: "NOT_FOUND" };

  const current = all[idx];
  const expired =
    Number.isFinite(Date.parse(current.expiresAt)) &&
    Date.parse(current.expiresAt) <= Date.now();

  if (expired) {
    if (current.status === "open") {
      const next = { ...current, status: "expired" as const };
      all[idx] = next;
      writeAll(all);
    }
    return { ok: false, error: "EXPIRED" };
  }

  if (current.status !== "open") return { ok: false, error: "NOT_OPEN" };

  const votesByVoterId = { ...(current.votesByVoterId ?? {}) };
  const prev = votesByVoterId[input.voterId];

  if (prev === input.choice) return { ok: true, request: current };

  const votes = { ...current.votes };
  if (prev === "yes") votes.yes = Math.max(0, votes.yes - 1);
  if (prev === "no") votes.no = Math.max(0, votes.no - 1);

  if (input.choice === "yes") votes.yes += 1;
  if (input.choice === "no") votes.no += 1;

  votesByVoterId[input.voterId] = input.choice;

  const needed = votesNeeded(memberCount);
  const status: RequestStatus =
    votes.yes >= needed ? "passed" : votes.no >= needed ? "rejected" : "open";

  const next: MoaiRequest = {
    ...current,
    status,
    votes,
    votesByVoterId,
  };

  all[idx] = next;
  writeAll(all);
  return { ok: true, request: next };
}

export type ExecuteEmergencyWithdrawalError =
  | "NOT_FOUND"
  | "NOT_EMERGENCY"
  | "NOT_PASSED"
  | "ALREADY_EXECUTED"
  | "INVALID_EXECUTOR";

export function executeEmergencyWithdrawalById(input: {
  requestId: string;
  executorId: string;
}):
  | { ok: true; request: EmergencyWithdrawalRequest }
  | { ok: false; error: ExecuteEmergencyWithdrawalError } {
  if (input.executorId.trim().length === 0)
    return { ok: false, error: "INVALID_EXECUTOR" };

  const all = readAll();
  const idx = all.findIndex((r) => r.id === input.requestId);
  if (idx < 0) return { ok: false, error: "NOT_FOUND" };

  const current = all[idx];
  if (current.type !== "emergency_withdrawal")
    return { ok: false, error: "NOT_EMERGENCY" };
  if (current.status !== "passed") return { ok: false, error: "NOT_PASSED" };
  if (current.executedAt) return { ok: false, error: "ALREADY_EXECUTED" };

  const receiptId =
    globalThis.crypto?.randomUUID?.() ?? `exec:${Date.now()}:${current.id}`;

  const next: EmergencyWithdrawalRequest = {
    ...current,
    executedAt: new Date().toISOString(),
    executedByVoterId: input.executorId,
    executionReceiptId: receiptId,
  };

  all[idx] = next;
  writeAll(all);
  return { ok: true, request: next };
}
