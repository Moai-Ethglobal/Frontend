"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readMyMoai } from "@/lib/moai";
import type { MoaiRequest } from "@/lib/requests";
import {
  listRequestsByMoaiId,
  requestTypeLabel,
  votesNeeded,
} from "@/lib/requests";

export function RequestsClient() {
  const [ready, setReady] = useState(false);
  const [requests, setRequests] = useState<MoaiRequest[]>([]);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    const moai = readMyMoai();
    if (!moai) {
      setMemberCount(0);
      setRequests([]);
      setReady(true);
      return;
    }

    setMemberCount(moai.members.length);
    setRequests(listRequestsByMoaiId(moai.id));
    setReady(true);
  }, []);

  const needed = useMemo(() => votesNeeded(memberCount), [memberCount]);

  if (!ready) return <p className="mt-10 text-sm text-neutral-600">Loading…</p>;

  if (memberCount === 0) {
    return (
      <div className="mt-12 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">
          No Moai found in this browser yet.
        </p>
        <div className="mt-4">
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai/create"
          >
            Create Moai
          </Link>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="mt-12 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">No requests yet.</p>
        <div className="mt-4">
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai/requests/new"
          >
            Create the first request
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-4">
      {requests.map((r) => {
        const amount =
          r.type === "emergency_withdrawal"
            ? r.amountUSDC
            : r.newContributionUSDC;
        const amountLabel =
          r.type === "emergency_withdrawal"
            ? `${amount} USDC`
            : `${amount} USDC / month`;

        return (
          <div className="rounded-xl border border-neutral-200 p-4" key={r.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {r.title}
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {requestTypeLabel(r.type)}
                </p>
              </div>
              <span className="text-sm font-medium text-neutral-900">
                {amountLabel}
              </span>
            </div>

            <p className="mt-3 text-sm text-neutral-700">{r.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-600">
              <span>Status: {r.status}</span>
              <span>
                Votes: {r.votes.yes}/{memberCount} (need {needed})
              </span>
              <span>Expires: {new Date(r.expiresAt).toLocaleDateString()}</span>
              <Link
                className="text-neutral-900 hover:underline"
                href={`/moai/requests/${r.id}`}
              >
                View
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
