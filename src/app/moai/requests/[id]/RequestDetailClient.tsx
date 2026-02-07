"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasCheckedIn, monthKey } from "@/lib/meetings";
import { readMyMoai } from "@/lib/moai";
import type { MoaiRequest } from "@/lib/requests";
import {
  getRequestById,
  requestTypeLabel,
  voteRequestById,
  votesNeeded,
} from "@/lib/requests";
import { readSession } from "@/lib/session";

export function RequestDetailClient({ requestId }: { requestId: string }) {
  const [request, setRequest] = useState<MoaiRequest | null>(null);
  const [ready, setReady] = useState(false);
  const [moaiId, setMoaiId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const moai = readMyMoai();
    setRequest(getRequestById(requestId));
    setMoaiId(moai?.id ?? null);
    setMemberCount(moai?.members.length ?? 0);
    setVoterId(readSession()?.id ?? null);
    setReady(true);
  }, [requestId]);

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
  const needed = memberCount > 0 ? votesNeeded(memberCount) : 0;
  const myVote = voterId ? request.votesByVoterId?.[voterId] : undefined;

  const amountLabel =
    request.type === "emergency_withdrawal"
      ? `${request.amountUSDC} USDC`
      : `${request.newContributionUSDC} USDC / month`;

  const activeThisMonth =
    Boolean(moaiId) &&
    Boolean(voterId) &&
    hasCheckedIn({
      moaiId: moaiId ?? "",
      month: monthKey(),
      voterId: voterId ?? "",
    });

  const canVote =
    Boolean(voterId) &&
    Boolean(moaiId) &&
    activeThisMonth &&
    status === "open" &&
    memberCount > 0;

  const onVote = (choice: "yes" | "no") => {
    setError(null);
    if (!voterId) {
      setError("Login to vote.");
      return;
    }
    if (!moaiId) {
      setError("Missing Moai context.");
      return;
    }
    if (
      !hasCheckedIn({
        moaiId,
        month: monthKey(),
        voterId,
      })
    ) {
      setError("Check in for this month to vote.");
      return;
    }

    const result = voteRequestById({
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
            {amountLabel}
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
          ) : !activeThisMonth ? (
            <Link
              className="text-sm font-medium text-neutral-900 hover:underline"
              href="/moai/meetings"
            >
              Check in
            </Link>
          ) : null}
        </div>
        {!activeThisMonth && voterId ? (
          <p className="mt-3 text-sm text-neutral-700">
            Not active this month. Check in at the monthly meeting to vote.
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
    </div>
  );
}
