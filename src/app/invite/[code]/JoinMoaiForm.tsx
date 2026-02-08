"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { joinMoaiAction } from "@/lib/actions";
import { isEvmAddress } from "@/lib/evm";
import { readMyMoai } from "@/lib/moai";
import { writeOnchainMoaiConfig } from "@/lib/onchainConfig";
import { joinOnchain } from "@/lib/onchainMoai";
import { createSession, readSession } from "@/lib/session";

type Props = {
  inviteCode: string;
};

export function JoinMoaiForm({ inviteCode }: Props) {
  if (isEvmAddress(inviteCode)) {
    return <JoinOnchainMoaiForm moaiAddress={inviteCode} />;
  }
  return <JoinLocalMoaiForm inviteCode={inviteCode} />;
}

function JoinOnchainMoaiForm({ moaiAddress }: { moaiAddress: string }) {
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "joining" }
    | { type: "joined"; hash: string | null }
    | { type: "error"; message: string }
  >({ type: "idle" });

  const onJoin = async () => {
    setStatus({ type: "joining" });
    const session = readSession() ?? createSession("email");

    writeOnchainMoaiConfig({ moaiAddress });
    const result = await joinOnchain({ sessionId: session.id });
    if (!result.ok) {
      if (result.error === "Already a member onchain.") {
        setStatus({ type: "joined", hash: null });
        return;
      }
      setStatus({ type: "error", message: result.error });
      return;
    }
    setStatus({ type: "joined", hash: result.hash });
  };

  if (status.type === "joined") {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Joined onchain</h2>
        {status.hash ? (
          <p className="mt-2 text-sm text-neutral-700">
            Transaction:{" "}
            <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
              {status.hash.slice(0, 12)}…{status.hash.slice(-8)}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-neutral-700">
            You&apos;re already a member.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            href="/moai/meetings"
          >
            Open meetings
          </Link>
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai"
          >
            View dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-xl border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold">Onchain invite</h2>
      <p className="mt-2 text-sm text-neutral-700">
        This link points to a Moai contract. Join onchain to become a member.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={status.type === "joining"}
          onClick={() => void onJoin()}
        >
          {status.type === "joining" ? "Joining…" : "Join onchain"}
        </button>
        <Link
          className="text-sm font-medium text-neutral-900 hover:underline"
          href="/auth"
        >
          Login / switch account
        </Link>
      </div>
      {status.type === "error" ? (
        <p className="mt-3 text-sm text-red-600">{status.message}</p>
      ) : null}
    </div>
  );
}

function JoinLocalMoaiForm({ inviteCode }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "ready"; moaiName: string }
    | { type: "blocked"; message: string }
    | { type: "joined"; moaiName: string }
    | { type: "error"; message: string }
  >({ type: "idle" });

  useEffect(() => {
    const moai = readMyMoai();
    if (!moai) {
      setStatus({
        type: "blocked",
        message:
          "This invite code is local to the browser that created the Moai.",
      });
      return;
    }
    if (moai.inviteCode !== inviteCode) {
      setStatus({
        type: "blocked",
        message:
          "This invite code doesn't match the Moai stored in this browser.",
      });
      return;
    }
    setStatus({ type: "ready", moaiName: moai.name });
  }, [inviteCode]);

  const canJoin = useMemo(() => displayName.trim().length > 0, [displayName]);

  const onJoin = () => {
    const session = readSession() ?? createSession("email");
    const result = joinMoaiAction({
      inviteCode,
      memberId: session.id,
      member: {
        displayName,
        email: email.trim().length > 0 ? email : undefined,
      },
    });

    if (!result.ok) {
      const message =
        result.error === "NO_MOAI"
          ? "No Moai found in this browser yet."
          : result.error === "CODE_MISMATCH"
            ? "This invite code doesn't match your local Moai."
            : result.error === "FULL"
              ? "This Moai is full."
              : result.error === "ALREADY_JOINED"
                ? "You're already a member."
                : "Please enter your name.";
      setStatus({ type: "error", message });
      return;
    }

    setStatus({ type: "joined", moaiName: result.moai.name });
  };

  if (status.type === "blocked") {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">{status.message}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            href="/moai/create"
          >
            Create Moai
          </Link>
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai"
          >
            Go to My Moai
          </Link>
        </div>
      </div>
    );
  }

  if (status.type === "joined") {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Joined</h2>
        <p className="mt-2 text-sm text-neutral-700">
          You joined{" "}
          <span className="font-medium text-neutral-900">
            {status.moaiName}
          </span>
          .
        </p>
        <div className="mt-4">
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            href="/moai"
          >
            View dashboard
          </Link>
        </div>
      </div>
    );
  }

  const helperText =
    status.type === "ready"
      ? `Join ${status.moaiName} as a member.`
      : "Enter your details to join.";

  return (
    <form className="mt-10 space-y-6">
      <p className="text-sm text-neutral-600">{helperText}</p>

      <div>
        <label
          className="text-sm font-medium text-neutral-900"
          htmlFor="displayName"
        >
          Your name
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          id="displayName"
          name="displayName"
          placeholder="e.g. Hema"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-900" htmlFor="email">
          Email (optional)
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          id="email"
          name="email"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {status.type === "error" ? (
        <p className="text-sm text-red-600">{status.message}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="text-sm font-medium text-neutral-900 hover:underline"
          href="/auth"
        >
          Login / switch account
        </Link>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={!canJoin}
          onClick={onJoin}
        >
          Join
        </button>
      </div>
    </form>
  );
}
