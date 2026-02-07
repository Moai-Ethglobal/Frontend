"use client";

import { useEffect, useMemo, useState } from "react";
import type { MoaiMember, MyMoai } from "@/lib/moai";
import { monthKey } from "@/lib/time";

function monthIndex(month: string): number | null {
  const [yRaw, mRaw] = month.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  if (m < 1 || m > 12) return null;
  return y * 12 + (m - 1);
}

function monthFromIso(iso: string): string | null {
  const month = iso.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

function sortMembersByJoinTime(members: MoaiMember[]): MoaiMember[] {
  return [...members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export function OrderCard({ moai }: { moai: MyMoai }) {
  const [month, setMonth] = useState<string | null>(null);

  useEffect(() => {
    setMonth(monthKey(new Date()));
  }, []);

  const startMonth = useMemo(
    () => monthFromIso(moai.createdAt),
    [moai.createdAt],
  );
  const orderedMembers = useMemo(
    () => sortMembersByJoinTime(moai.members),
    [moai.members],
  );

  const next = useMemo(() => {
    if (!month || !startMonth) return null;
    if (orderedMembers.length === 0) return null;

    const currentIdx = monthIndex(month);
    const startIdx = monthIndex(startMonth);
    if (currentIdx === null || startIdx === null) return null;

    const delta = Math.max(0, currentIdx - startIdx);
    const idx = delta % orderedMembers.length;
    return orderedMembers[idx] ?? null;
  }, [month, orderedMembers, startMonth]);

  return (
    <div className="mt-10 rounded-xl border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold">Order</h2>
      <p className="mt-2 text-sm text-neutral-700">
        Rotation is shown for demo purposes.
      </p>

      <div className="mt-3 text-sm text-neutral-700">
        <p>
          This month:{" "}
          <span className="font-medium text-neutral-900">{month ?? "—"}</span>
        </p>
        <p className="mt-1">
          Next:{" "}
          <span className="font-medium text-neutral-900">
            {next ? next.displayName : "—"}
          </span>
        </p>
      </div>

      {orderedMembers.length > 0 ? (
        <ol className="mt-4 space-y-2 text-sm">
          {orderedMembers.map((m) => {
            const isNext = next?.id === m.id;
            return (
              <li className="flex items-center justify-between" key={m.id}>
                <span className={isNext ? "font-medium text-neutral-900" : ""}>
                  {m.displayName}
                </span>
                <span className="text-neutral-600">{m.role}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-neutral-600">No members yet.</p>
      )}
    </div>
  );
}
