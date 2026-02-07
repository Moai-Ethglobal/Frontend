"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { invitePath } from "@/lib/invite";
import type { MyMoai } from "@/lib/moai";
import { readMyMoai } from "@/lib/moai";

export function MyMoaiClient() {
  const [moai, setMoai] = useState<MyMoai | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMoai(readMyMoai());
    setReady(true);
  }, []);

  const localInvitePath = moai ? invitePath(moai.inviteCode) : null;

  const localInviteUrl = useMemo(() => {
    if (!localInvitePath) return null;
    if (typeof window === "undefined") return localInvitePath;
    return `${window.location.origin}${localInvitePath}`;
  }, [localInvitePath]);

  if (!ready) {
    return <p className="mt-10 text-sm text-neutral-600">Loading…</p>;
  }

  if (!moai) {
    return (
      <>
        <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
          You don&apos;t have a Moai yet. Create one or open an invite link to
          join.
        </p>

        <div className="mt-10 grid gap-3 sm:max-w-sm sm:grid-cols-2">
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            href="/moai/create"
          >
            Create Moai
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            href="/learn"
          >
            Learn
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        {moai.name} · {moai.members.length} member
        {moai.members.length === 1 ? "" : "s"}
      </p>

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Invite</h2>
        <p className="mt-2 text-sm text-neutral-700">
          Share this link to add members.
        </p>
        {localInviteUrl ? (
          <div className="mt-3 space-y-3">
            <input
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
              readOnly
              value={localInviteUrl}
            />
            <Link
              className="text-sm font-medium text-neutral-900 hover:underline"
              href={localInvitePath ?? "/"}
            >
              Open join page
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Members</h2>
        <ul className="mt-3 space-y-2">
          {moai.members.map((m) => (
            <li
              className="flex items-center justify-between text-sm"
              key={m.id}
            >
              <span className="text-neutral-900">{m.displayName}</span>
              <span className="text-neutral-600">{m.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
