import type { ContributionPayment } from "./contributions";
import { markContributionPaid } from "./contributions";
import { checkInMeeting, type Meeting } from "./meetings";
import {
  createMyMoai,
  joinMyMoaiByInviteCode,
  type MyMoai,
  markMemberPast,
  setMonthlyContributionUSDC,
} from "./moai";
import type { Proof } from "./proofs";
import { uploadProof } from "./proofs";
import type {
  CreateRequestInput,
  EmergencyWithdrawalRequest,
  ExecuteEmergencyWithdrawalError,
  MoaiRequest,
  VoteChoice,
  VoteRequestError,
} from "./requests";
import {
  createRequest,
  executeEmergencyWithdrawalById,
  getRequestById,
  voteRequestById,
} from "./requests";
import type { RotationWithdrawal } from "./withdrawals";
import { createRotationWithdrawal } from "./withdrawals";

export type ApplyRequestEffectsResult = {
  applied: boolean;
  errors: string[];
};

function applyRequestPassEffects(
  request: MoaiRequest,
): ApplyRequestEffectsResult {
  if (request.status !== "passed") return { applied: false, errors: [] };

  if (request.type === "change_contribution") {
    const result = setMonthlyContributionUSDC({
      moaiId: request.moaiId,
      monthlyContributionUSDC: request.newContributionUSDC,
    });
    return result.ok
      ? { applied: true, errors: [] }
      : { applied: false, errors: [result.error] };
  }

  if (request.type === "demise" || request.type === "awol") {
    const result = markMemberPast({
      moaiId: request.moaiId,
      memberId: request.subjectMemberId,
      reason: request.type,
    });
    return result.ok
      ? { applied: true, errors: [] }
      : { applied: false, errors: [result.error] };
  }

  return { applied: false, errors: [] };
}

export function voteRequestWithEffects(input: {
  requestId: string;
  choice: VoteChoice;
  voterId: string;
  memberCount: number;
}):
  | { ok: true; request: MoaiRequest; effects: ApplyRequestEffectsResult }
  | { ok: false; error: VoteRequestError } {
  const before = getRequestById(input.requestId);
  const result = voteRequestById(input);
  if (!result.ok) return result;

  const becamePassed =
    before?.status !== "passed" && result.request.status === "passed";

  const effects = becamePassed
    ? applyRequestPassEffects(result.request)
    : { applied: false, errors: [] };

  return { ok: true, request: result.request, effects };
}

export function createMoaiAction(
  input: Parameters<typeof createMyMoai>[0],
): MyMoai {
  return createMyMoai(input);
}

export function joinMoaiAction(
  input: Parameters<typeof joinMyMoaiByInviteCode>[0],
): ReturnType<typeof joinMyMoaiByInviteCode> {
  return joinMyMoaiByInviteCode(input);
}

export function payContributionAction(
  input: Parameters<typeof markContributionPaid>[0],
): ContributionPayment {
  return markContributionPaid(input);
}

export function createRequestAction(input: CreateRequestInput): MoaiRequest {
  return createRequest(input);
}

export function executeEmergencyWithdrawalAction(input: {
  requestId: string;
  executorId: string;
}):
  | { ok: true; request: EmergencyWithdrawalRequest }
  | { ok: false; error: ExecuteEmergencyWithdrawalError } {
  return executeEmergencyWithdrawalById(input);
}

export function checkInMeetingAction(
  input: Parameters<typeof checkInMeeting>[0],
): Meeting {
  return checkInMeeting(input);
}

export function withdrawRotationAction(
  input: Parameters<typeof createRotationWithdrawal>[0],
): RotationWithdrawal {
  return createRotationWithdrawal(input);
}

export async function uploadProofAction(
  input: Parameters<typeof uploadProof>[0],
): Promise<{ ok: true; proof: Proof } | { ok: false; error: string }> {
  return uploadProof(input);
}
