"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readMyMoai } from "@/lib/moai";
import { readSession } from "@/lib/session";
import { parseUSDC } from "@/lib/usdc";
import { LiFiBridgeWidget } from "./LiFiBridgeWidget";

export function DepositClient() {
  const [ready, setReady] = useState(false);
  const [hasMoai, setHasMoai] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(
    null,
  );
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const moai = readMyMoai();
    const session = readSession();

    setHasMoai(Boolean(moai));
    setMonthlyContribution(
      moai?.monthlyContributionUSDC
        ? parseUSDC(moai.monthlyContributionUSDC)
        : null,
    );
    setWalletAddress(session?.method === "wallet" ? session.id : null);
    setReady(true);
  }, []);

  const onCopy = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  if (!ready) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Loading…</p>
      </div>
    );
  }

  if (!hasMoai) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">
          Create or join a Moai first to deposit.
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

  return (
    <div className="mt-10 space-y-4">
      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Bridge USDC in</h2>
          <button
            className="text-sm font-medium text-neutral-900 hover:underline"
            type="button"
            onClick={() => void onCopy()}
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy link"}
          </button>
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Use chain abstraction to deposit from any chain.
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          The URL updates with your current selection.
        </p>
        <div className="mt-4">
          <LiFiBridgeWidget
            defaultAmountUSDC={monthlyContribution ?? undefined}
            defaultToAddress={walletAddress ?? undefined}
          />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Back</h2>
          <Link className="text-neutral-900 hover:underline" href="/moai">
            My Moai
          </Link>
        </div>
      </div>
    </div>
  );
}
