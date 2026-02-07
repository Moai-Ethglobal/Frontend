"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MoaiRequest } from "@/lib/requests";
import { getRequestById } from "@/lib/requests";

function formatType(type: MoaiRequest["type"]): string {
  return type === "emergency_withdrawal"
    ? "Emergency withdrawal"
    : "Contribution change";
}

export function RequestDetailClient({ requestId }: { requestId: string }) {
  const [request, setRequest] = useState<MoaiRequest | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRequest(getRequestById(requestId));
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

  const amountLabel =
    request.type === "emergency_withdrawal"
      ? `${request.amountUSDC} USDC`
      : `${request.newContributionUSDC} USDC / month`;

  return (
    <div className="mt-10 space-y-6">
      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {request.title}
            </p>
            <p className="mt-1 text-sm text-neutral-700">
              {formatType(request.type)}
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
          <span>Status: {request.status}</span>
          <span>
            Votes: {request.votes.yes} yes / {request.votes.no} no
          </span>
          <span>
            Expires: {new Date(request.expiresAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">
          Voting UI (approve/deny) will be wired next.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-50"
            type="button"
            disabled
          >
            Approve
          </button>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 opacity-50"
            type="button"
            disabled
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}
