"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  executeEmergencyWithdrawalAction,
  voteRequestWithEffects,
} from "@/lib/actions";
import { hasCheckedIn } from "@/lib/meetings";
import type { MyMoai } from "@/lib/moai";
import { isActiveMemberId, listActiveMembers, readMyMoai } from "@/lib/moai";
import type { MoaiRequest } from "@/lib/requests";
import {
  getRequestById,
  requestTypeLabel,
  votesNeededByType,
} from "@/lib/requests";
import { readSession } from "@/lib/session";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import { monthKey } from "@/lib/time";

export function RequestDetailClient({ requestId }: { requestId: string }) {
  const [request, setRequest] = useState<MoaiRequest | null>(null);
  const [ready, setReady] = useState(false);
  const [moai, setMoai] = useState<MyMoai | null>(null);
  const [moaiId, setMoaiId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const currentMoai = readMyMoai();
    setMoai(currentMoai);
    setRequest(getRequestById(requestId));
    setMoaiId(currentMoai?.id ?? null);
    setMemberCount(currentMoai ? listActiveMembers(currentMoai).length : 0);
    setVoterId(readSession()?.id ?? null);
    setMonth(monthKey(new Date()));
    setReady(true);
  }, [requestId]);

  useEffect(() => {
    refresh();

    const onChanged = (evt: Event) => {
      const detail = (evt as CustomEvent<StorageChangeDetail>).detail;
      if (!detail?.key) return;
      if (
        detail.key !== "moai.requests.v1" &&
        detail.key !== "moai.myMoai.v1" &&
        detail.key !== "moai.meetings.v1"
      )
        return;
      refresh();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, onChanged);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onChanged);
  }, [refresh]);

  if (!ready) return <p className="mt-10 text-sm text-neutral-600">Loading…</p>;

  if (!request) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Request not found.</p>
        <div className="mt-4">
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai/requests"
          >
            Back to requests
          </Link>
        </div>
      </div>
    );
  }

  const expired =
    Number.isFinite(Date.parse(request.expiresAt)) &&
    Date.parse(request.expiresAt) <= Date.now();
  const status =
    expired && request.status === "open" ? "expired" : request.status;
  const needed =
    memberCount > 0 ? votesNeededByType(request.type, memberCount) : 0;
  const myVote = voterId ? request.votesByVoterId?.[voterId] : undefined;

  const rightLabel =
    request.type === "emergency_withdrawal"
      ? `${request.amountUSDC} USDC`
      : request.type === "change_contribution"
        ? `${request.newContributionUSDC} USDC / month`
        : `Subject: ${request.subjectMemberName}`;

  const memberActive = Boolean(
    moai && voterId && isActiveMemberId(moai, voterId),
  );

  const checkedInThisMonth =
    Boolean(moaiId) &&
    Boolean(voterId) &&
    Boolean(month) &&
    memberActive &&
    hasCheckedIn({
      moaiId: moaiId ?? "",
      month: month ?? "",
      voterId: voterId ?? "",
    });

  const canVote =
    Boolean(voterId) &&
    Boolean(moaiId) &&
    memberActive &&
    status === "open" &&
    memberCount > 0;

  const onVote = (choice: "yes" | "no") => {
    setError(null);
    setExecError(null);
    if (!voterId) {
      setError("Login to vote.");
      return;
    }
    if (!moaiId) {
      setError("Missing Moai context.");
      return;
    }
    if (!memberActive) {
      setError("Only active members can vote.");
      return;
    }

    const result = voteRequestWithEffects({
      requestId,
      choice,
      voterId,
      memberCount,
    });

    if (!result.ok) {
      const message =
        result.error === "EXPIRED"
          ? "This request has expired."
          : result.error === "NOT_OPEN"
            ? "Voting is closed for this request."
            : result.error === "INVALID_CONTEXT"
              ? "Missing Moai context."
              : result.error === "NOT_FOUND"
                ? "Request not found."
                : "Unable to vote.";
      setError(message);
      setRequest(getRequestById(requestId));
      return;
    }

    if (result.effects.applied && result.effects.errors.length > 0) {
      setError("Vote saved, but an update couldn't be applied.");
    }

    setRequest(result.request);
  };

  const onExecute = () => {
    setExecError(null);
    setError(null);
    if (!voterId) {
      setExecError("Login to execute.");
      return;
    }
    if (!moaiId) {
      setExecError("Missing Moai context.");
      return;
    }
    if (!memberActive) {
      setExecError("Only active members can execute.");
      return;
    }

    if (request.type !== "emergency_withdrawal") {
      setExecError("Only emergency withdrawals can be executed.");
      return;
    }

    const result = executeEmergencyWithdrawalAction({
      requestId,
      executorId: voterId,
    });

    if (!result.ok) {
      const message =
        result.error === "NOT_PASSED"
          ? "This request has not passed."
          : result.error === "INSUFFICIENT_RESERVE"
            ? "Not enough in the emergency reserve."
            : result.error === "ALREADY_EXECUTED"
              ? "This request was already executed."
              : result.error === "NOT_FOUND"
                ? "Request not found."
                : "Unable to execute.";
      setExecError(message);
      setRequest(getRequestById(requestId));
      return;
    }

    setRequest(result.request);
  };

  return (
    <div className="mt-10 space-y-6">
      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {request.title}
            </p>
            <p className="mt-1 text-sm text-neutral-700">
              {requestTypeLabel(request.type)}
            </p>
          </div>
          <span className="text-sm font-medium text-neutral-900">
            {rightLabel}
          </span>
        </div>

        {request.type === "emergency_withdrawal" ? (
          <p className="mt-3 text-sm text-neutral-700">
            Beneficiary:{" "}
            <span className="font-medium text-neutral-900">
              {request.beneficiaryName}
            </span>
          </p>
        ) : null}

        {request.type === "demise" || request.type === "awol" ? (
          <div className="mt-3 text-sm text-neutral-700">
            <p>
              Subject:{" "}
              <span className="font-medium text-neutral-900">
                {request.subjectMemberName}
              </span>
            </p>

            {request.proofs.length > 0 ? (
              <div className="mt-2">
                <p className="text-sm text-neutral-600">
                  Proofs ({request.proofs.length})
                </p>
                <ul className="mt-2 space-y-2">
                  {request.proofs.map((p) => (
                    <li className="text-sm" key={p.id}>
                      <span className="text-neutral-900">{p.name}</span>{" "}
                      <span className="text-neutral-600">
                        ({p.mime}, {Math.round(p.size / 1024)} KB)
                      </span>
                      <div className="mt-1">
                        <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700">
                          {p.sha256.slice(0, 16)}…{p.sha256.slice(-8)}
                        </span>
                      </div>
                      {p.uri ? (
                        <div className="mt-1">
                          <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700">
                            {p.uri}
                          </span>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {request.description.trim().length > 0 ? (
          <p className="mt-3 text-sm text-neutral-700">{request.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-600">
          <span>Status: {status}</span>
          <span>
            Votes: {request.votes.yes} yes / {request.votes.no} no
          </span>
          {memberCount > 0 ? <span>Need: {needed}</span> : null}
          <span>
            Expires: {new Date(request.expiresAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-700">
            {myVote
              ? `Your vote: ${myVote === "yes" ? "approve" : "deny"}`
              : "Vote"}
          </p>
          {!voterId ? (
            <Link
              className="text-sm font-medium text-neutral-900 hover:underline"
              href="/auth"
            >
              Login
            </Link>
          ) : !checkedInThisMonth ? (
            <Link
              className="text-sm font-medium text-neutral-900 hover:underline"
              href="/moai/meetings"
            >
              Check in
            </Link>
          ) : null}
        </div>
        {!checkedInThisMonth && voterId ? (
          <p className="mt-3 text-sm text-neutral-700">
            Not checked in this month. Check-in is optional, but recommended.
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            disabled={!canVote}
            onClick={() => onVote("yes")}
          >
            Approve
          </button>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
            type="button"
            disabled={!canVote}
            onClick={() => onVote("no")}
          >
            Deny
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      {request.type === "emergency_withdrawal" ? (
        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-neutral-700">Execution</p>
            {!voterId ? (
              <Link
                className="text-sm font-medium text-neutral-900 hover:underline"
                href="/auth"
              >
                Login
              </Link>
            ) : !checkedInThisMonth ? (
              <Link
                className="text-sm font-medium text-neutral-900 hover:underline"
                href="/moai/meetings"
              >
                Check in
              </Link>
            ) : null}
          </div>

          {request.executedAt ? (
            <div className="mt-3 text-sm text-neutral-700">
              <p>
                Executed at{" "}
                <span className="font-medium text-neutral-900">
                  {new Date(request.executedAt).toLocaleString(undefined)}
                </span>
                .
              </p>
              {request.executionReceiptId ? (
                <p className="mt-1">
                  Receipt:{" "}
                  <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
                    {request.executionReceiptId}
                  </span>
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-neutral-700">
                Execute payout after the request passes.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  type="button"
                  disabled={!(status === "passed" && memberActive && voterId)}
                  onClick={onExecute}
                >
                  Execute payout (mock)
                </button>
              </div>
            </>
          )}

          {execError ? (
            <p className="mt-3 text-sm text-red-600">{execError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
