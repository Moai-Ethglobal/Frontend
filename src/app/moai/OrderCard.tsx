"use client";

import { useEffect, useMemo, useState } from "react";
import type { MyMoai } from "@/lib/moai";
import { rotationNextMember, rotationOrder } from "@/lib/rotation";
import { monthKey } from "@/lib/time";

export function OrderCard({ moai }: { moai: MyMoai }) {
  const [month, setMonth] = useState<string | null>(null);

  useEffect(() => {
    setMonth(monthKey(new Date()));
  }, []);

  const orderedMembers = useMemo(() => rotationOrder(moai), [moai]);

  const next = useMemo(() => {
    if (!month) return null;
    return rotationNextMember(moai, month);
  }, [moai, month]);

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
