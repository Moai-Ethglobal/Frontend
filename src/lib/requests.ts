import { readJson, writeJson } from "./storage";

export type RequestStatus = "open" | "passed" | "rejected" | "expired";

export type EmergencyWithdrawalRequest = {
  id: string;
  moaiId: string;
  type: "emergency_withdrawal";
  title: string;
  description: string;
  beneficiaryName: string;
  amountUSDC: string;
  status: RequestStatus;
  createdAt: string;
  expiresAt: string;
  votes: { yes: number; no: number };
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
};

export type MoaiRequest =
  | EmergencyWithdrawalRequest
  | ContributionChangeRequest;

export type CreateRequestInput =
  | Omit<
      EmergencyWithdrawalRequest,
      "id" | "status" | "createdAt" | "expiresAt" | "votes"
    >
  | Omit<
      ContributionChangeRequest,
      "id" | "status" | "createdAt" | "expiresAt" | "votes"
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
