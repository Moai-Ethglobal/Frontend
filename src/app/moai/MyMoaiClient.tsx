"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { invitePath } from "@/lib/invite";
import { isMemberActive, type MyMoai, readMyMoai } from "@/lib/moai";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import { ActiveStatusCard } from "./ActiveStatusCard";
import { ContributionCard } from "./ContributionCard";
import { ExecutionCard } from "./ExecutionCard";
import { HistoryCard } from "./HistoryCard";
import { OrderCard } from "./OrderCard";
import { PoolCard } from "./PoolCard";
import { WithdrawCard } from "./WithdrawCard";

export function MyMoaiClient() {
  const [moai, setMoai] = useState<MyMoai | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setMoai(readMyMoai());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();

    const onChanged = (evt: Event) => {
      const detail = (evt as CustomEvent<StorageChangeDetail>).detail;
      if (!detail?.key) return;
      if (detail.key !== "moai.myMoai.v1") return;
      refresh();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, onChanged);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onChanged);
  }, [refresh]);

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

  const activeMembers = moai.members.filter(isMemberActive);
  const pastMembers = moai.members.filter((m) => !isMemberActive(m));

  return (
    <>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        {moai.name} · {activeMembers.length} member
        {activeMembers.length === 1 ? "" : "s"}
        {pastMembers.length > 0 ? ` (+${pastMembers.length} past)` : ""}
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

      <ActiveStatusCard moaiId={moai.id} />

      <ExecutionCard />

      <PoolCard moaiId={moai.id} />

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Deposit</h2>
          <Link
            className="text-neutral-900 hover:underline"
            href="/moai/deposit"
          >
            Open
          </Link>
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Bridge USDC in via chain abstraction (LI.FI).
        </p>
      </div>

      <OrderCard moai={moai} />

      <ContributionCard moai={moai} />

      <WithdrawCard moai={moai} />

      <HistoryCard moaiId={moai.id} />

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Members</h2>
        <ul className="mt-3 space-y-2">
          {activeMembers.map((m) => (
            <li
              className="flex items-center justify-between text-sm"
              key={m.id}
            >
              <span className="text-neutral-900">{m.displayName}</span>
              <span className="text-neutral-600">{m.role}</span>
            </li>
          ))}
        </ul>
        {pastMembers.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              Past members
            </h3>
            <ul className="mt-3 space-y-2">
              {pastMembers.map((m) => (
                <li
                  className="flex items-center justify-between text-sm"
                  key={m.id}
                >
                  <span className="text-neutral-900">{m.displayName}</span>
                  <span className="text-neutral-600">
                    {m.pastReason ?? "past"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Meetings</h2>
          <Link
            className="text-neutral-900 hover:underline"
            href="/moai/meetings"
          >
            Open
          </Link>
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Monthly check-in keeps membership active.
        </p>
      </div>

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Requests</h2>
          <div className="flex items-center gap-3 text-sm">
            <Link
              className="text-neutral-900 hover:underline"
              href="/moai/requests"
            >
              View all
            </Link>
            <Link
              className="text-neutral-900 hover:underline"
              href="/moai/requests/new"
            >
              Create
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Emergency withdrawals and other approvals.
        </p>
      </div>

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Demise / AWOL</h2>
          <Link
            className="text-neutral-900 hover:underline"
            href="/moai/demise"
          >
            Open
          </Link>
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Submit reports with proof attachments for member status changes.
        </p>
      </div>
    </>
  );
}
