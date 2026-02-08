"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { shortEvmAddress } from "@/lib/evm";
import { invitePath } from "@/lib/invite";
import { isMemberActive, type MyMoai, readMyMoai } from "@/lib/moai";
import { readOnchainMoaiConfig } from "@/lib/onchainConfig";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import { ActiveStatusCard } from "./ActiveStatusCard";
import { ContributionCard } from "./ContributionCard";
import { ExecutionCard } from "./ExecutionCard";
import { HistoryCard } from "./HistoryCard";
import { OnchainCard } from "./OnchainCard";
import { OrderCard } from "./OrderCard";
import { PoolCard } from "./PoolCard";
import { WithdrawCard } from "./WithdrawCard";

type EnsResponse = {
  name?: unknown;
  avatar?: unknown;
};

function asEnsResponse(value: unknown): EnsResponse | null {
  if (!value || typeof value !== "object") return null;
  return value as EnsResponse;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function MyMoaiClient() {
  const [moai, setMoai] = useState<MyMoai | null>(null);
  const [ready, setReady] = useState(false);
  const [onchainMoaiAddress, setOnchainMoaiAddress] = useState<string | null>(
    null,
  );
  const [ensByMemberId, setEnsByMemberId] = useState<
    Record<string, { name: string | null; avatar: string | null }>
  >({});

  const refresh = useCallback(() => {
    setMoai(readMyMoai());
    setOnchainMoaiAddress(readOnchainMoaiConfig()?.moaiAddress ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();

    const onChanged = (evt: Event) => {
      const detail = (evt as CustomEvent<StorageChangeDetail>).detail;
      if (!detail?.key) return;
      if (detail.key !== "moai.myMoai.v1" && detail.key !== "moai.onchain.v1")
        return;
      refresh();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, onChanged);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onChanged);
  }, [refresh]);

  const localInvitePath = moai ? invitePath(moai.inviteCode) : null;
  const onchainInvitePath = onchainMoaiAddress
    ? invitePath(onchainMoaiAddress)
    : null;

  const shareInvitePath = onchainInvitePath ?? localInvitePath;

  const shareInviteUrl = useMemo(() => {
    if (!shareInvitePath) return null;
    if (typeof window === "undefined") return shareInvitePath;
    return `${window.location.origin}${shareInvitePath}`;
  }, [shareInvitePath]);

  const activeMembers = useMemo(() => {
    return moai ? moai.members.filter(isMemberActive) : [];
  }, [moai]);

  const pastMembers = useMemo(() => {
    return moai ? moai.members.filter((m) => !isMemberActive(m)) : [];
  }, [moai]);

  const ensTargets = useMemo(() => {
    return activeMembers
      .map((m) => ({ id: m.id, address: m.walletAddress }))
      .filter((m): m is { id: string; address: string } => Boolean(m.address));
  }, [activeMembers]);

  useEffect(() => {
    let cancelled = false;
    if (ensTargets.length === 0) return;

    Promise.all(
      ensTargets.map(async (m) => {
        try {
          const res = await fetch(
            `/api/ens?address=${encodeURIComponent(m.address)}`,
          );
          const json = (await res.json().catch(() => null)) as unknown;
          const obj = asEnsResponse(json);
          const name = asString(obj?.name);
          const avatar = asString(obj?.avatar);
          return { id: m.id, name, avatar };
        } catch {
          return { id: m.id, name: null, avatar: null };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setEnsByMemberId((prev) => {
        const next = { ...prev };
        for (const r of results)
          next[r.id] = { name: r.name, avatar: r.avatar };
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [ensTargets]);

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

        {onchainMoaiAddress ? (
          <div className="mt-10 rounded-xl border border-neutral-200 p-4">
            <h2 className="text-sm font-semibold">Onchain</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Contract:{" "}
              <span className="font-mono text-xs">
                {shortEvmAddress(onchainMoaiAddress)}
              </span>
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                href="/moai/meetings"
              >
                Open meetings
              </Link>
              <span className="text-sm text-neutral-600">
                You can still use token-gated meetings.
              </span>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p className="mt-3 text-pretty text-lg leading-8 text-neutral-800">
        {moai.name} · {activeMembers.length} member
        {activeMembers.length === 1 ? "" : "s"}
        {pastMembers.length > 0 ? ` (+${pastMembers.length} past)` : ""}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          className="flex min-h-[56px] items-center justify-center rounded-xl bg-neutral-900 px-6 py-3 text-base font-semibold text-white hover:bg-neutral-800"
          href="/moai/meetings"
        >
          Check in
        </Link>
        <ContributionCard moai={moai} />
        <WithdrawCard moai={moai} />
      </div>

      <ActiveStatusCard moaiId={moai.id} />

      <PoolCard moaiId={moai.id} />

      <OrderCard moai={moai} />

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Invite</h2>
        <p className="mt-2 text-sm text-neutral-700">
          Share this link to add members.
        </p>
        {shareInviteUrl ? (
          <div className="mt-3 space-y-3">
            <input
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
              readOnly
              value={shareInviteUrl}
            />
            <Link
              className="text-sm font-medium text-neutral-900 hover:underline"
              href={shareInvitePath ?? "/"}
            >
              Open join page
            </Link>
            {onchainInvitePath ? (
              <p className="text-xs text-neutral-600">
                Onchain invite works across devices.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

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

      <details className="mt-10">
        <summary className="cursor-pointer text-sm font-semibold text-neutral-900">
          Advanced
        </summary>
        <div className="mt-4 space-y-0">
          <ExecutionCard />
          <OnchainCard />
          <HistoryCard moaiId={moai.id} />
        </div>
      </details>

      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Members</h2>
        <ul className="mt-3 space-y-2">
          {activeMembers.map((m) => (
            <li
              className="flex items-center justify-between gap-3 text-sm"
              key={m.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                {ensByMemberId[m.id]?.avatar ? (
                  <Image
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full border border-neutral-200 object-cover"
                    height={28}
                    src={ensByMemberId[m.id]?.avatar ?? ""}
                    unoptimized
                    width={28}
                  />
                ) : (
                  <span className="h-7 w-7 shrink-0 rounded-full border border-neutral-200 bg-neutral-50" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">
                    {m.displayName}
                  </p>
                  {ensByMemberId[m.id]?.name ? (
                    <p className="truncate text-xs text-neutral-600">
                      {ensByMemberId[m.id]?.name}
                    </p>
                  ) : m.walletAddress ? (
                    <p className="truncate text-xs text-neutral-600">
                      {shortEvmAddress(m.walletAddress)}
                    </p>
                  ) : null}
                </div>
              </div>
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
                  className="flex items-center justify-between gap-3 text-sm"
                  key={m.id}
                >
                  <span className="min-w-0 truncate text-neutral-900">
                    {m.displayName}
                  </span>
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
