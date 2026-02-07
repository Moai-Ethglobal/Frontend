"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMeeting } from "@/lib/meetings";
import { readSession } from "@/lib/session";
import { monthKey } from "@/lib/time";

export function ActiveStatusCard({ moaiId }: { moaiId: string }) {
  const [ready, setReady] = useState(false);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    const id = session?.id ?? null;
    const m = monthKey(new Date());

    setVoterId(id);
    setMonth(m);

    if (id) {
      const meeting = getMeeting(moaiId, m);
      const at = meeting?.attendanceByVoterId[id] ?? null;
      setCheckedInAt(at);
    } else {
      setCheckedInAt(null);
    }

    setReady(true);
  }, [moaiId]);

  if (!ready) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Loading…</p>
      </div>
    );
  }

  const active = Boolean(checkedInAt);

  return (
    <div className="mt-10 rounded-xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Status</h2>
          <p className="mt-2 text-sm text-neutral-700">
            This month{month ? ` (${month})` : ""}:{" "}
            <span className="font-medium text-neutral-900">
              {voterId ? (active ? "active" : "not active") : "login required"}
            </span>
          </p>
          {checkedInAt ? (
            <p className="mt-1 text-sm text-neutral-600">
              Checked in at {new Date(checkedInAt).toLocaleString(undefined)}.
            </p>
          ) : null}
        </div>

        {!voterId ? (
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/auth"
          >
            Login
          </Link>
        ) : (
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai/meetings"
          >
            {active ? "Meetings" : "Check in"}
          </Link>
        )}
      </div>
    </div>
  );
}
