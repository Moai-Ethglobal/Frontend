"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getCheckInReceiptId, getMeeting } from "@/lib/meetings";
import { isActiveMemberId, readMyMoai } from "@/lib/moai";
import { readSession } from "@/lib/session";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import { monthKey } from "@/lib/time";

export function ActiveStatusCard({ moaiId }: { moaiId: string }) {
  const [ready, setReady] = useState(false);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const session = readSession();
    const id = session?.id ?? null;
    const m = monthKey(new Date());

    setVoterId(id);
    setMonth(m);

    const moai = readMyMoai();
    const memberActive = Boolean(moai && id && isActiveMemberId(moai, id));

    if (id && memberActive) {
      const meeting = getMeeting(moaiId, m);
      const at = meeting?.attendanceByVoterId[id] ?? null;
      setCheckedInAt(at);
      setReceiptId(getCheckInReceiptId({ moaiId, month: m, voterId: id }));
    } else {
      setCheckedInAt(null);
      setReceiptId(null);
    }

    setReady(true);
  }, [moaiId]);

  useEffect(() => {
    refresh();

    const onChanged = (evt: Event) => {
      const detail = (evt as CustomEvent<StorageChangeDetail>).detail;
      if (!detail?.key) return;
      if (
        detail.key !== "moai.meetings.v1" &&
        detail.key !== "moai.session.v1" &&
        detail.key !== "moai.myMoai.v1"
      )
        return;
      refresh();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, onChanged);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onChanged);
  }, [refresh]);

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
          {receiptId ? (
            <p className="mt-1 text-sm text-neutral-600">
              Receipt:{" "}
              <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
                {receiptId.slice(0, 12)}…{receiptId.slice(-6)}
              </span>
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
