"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { withdrawRotationAction } from "@/lib/actions";
import type { ContributionPayment } from "@/lib/contributions";
import { listContributionPaymentsByMoaiId } from "@/lib/contributions";
import { splitMonthlyContributions } from "@/lib/economics";
import { getMeeting } from "@/lib/meetings";
import { isActiveMemberId, type MyMoai } from "@/lib/moai";
import { readOnchainMoaiState, withdrawOnchain } from "@/lib/onchainMoai";
import { rotationNextMember } from "@/lib/rotation";
import { readSession } from "@/lib/session";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import { monthKey } from "@/lib/time";
import { sumUSDC } from "@/lib/usdc";
import type { Withdrawal } from "@/lib/withdrawals";
import { listWithdrawalsByMoaiId } from "@/lib/withdrawals";

export function WithdrawCard({ moai }: { moai: MyMoai }) {
  const [ready, setReady] = useState(false);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [payments, setPayments] = useState<ContributionPayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [onchain, setOnchain] = useState<Awaited<
    ReturnType<typeof readOnchainMoaiState>
  > | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const session = readSession();
    const id = session?.id ?? null;
    const m = monthKey(new Date());

    setVoterId(id);
    setMonth(m);
    setPayments(listContributionPaymentsByMoaiId(moai.id));
    setWithdrawals(listWithdrawalsByMoaiId(moai.id));

    if (id) {
      const meeting = getMeeting(moai.id, m);
      setCheckedInAt(meeting?.attendanceByVoterId[id] ?? null);
    } else {
      setCheckedInAt(null);
    }

    setReady(true);
  }, [moai.id]);

  useEffect(() => {
    let cancelled = false;
    const id = voterId;
    if (!id) {
      setOnchain(null);
      return;
    }
    readOnchainMoaiState({ sessionId: id }).then((s) => {
      if (cancelled) return;
      setOnchain(s);
    });
    return () => {
      cancelled = true;
    };
  }, [voterId]);

  useEffect(() => {
    refresh();

    const onChanged = (evt: Event) => {
      const detail = (evt as CustomEvent<StorageChangeDetail>).detail;
      if (!detail?.key) return;
      if (!detail.key.startsWith("moai.")) return;
      refresh();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, onChanged);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onChanged);
  }, [refresh]);

  const activeThisMonth = Boolean(checkedInAt);
  const memberActive = Boolean(voterId && isActiveMemberId(moai, voterId));

  const nextMember = useMemo(() => {
    if (!month) return null;
    return rotationNextMember(moai, month);
  }, [moai, month]);

  const isNext =
    Boolean(voterId) && Boolean(nextMember) && voterId === nextMember?.id;

  const collectedThisMonth = useMemo(() => {
    if (!month) return 0;
    return sumUSDC(
      payments.filter((p) => p.month === month).map((p) => p.amountUSDC),
    );
  }, [month, payments]);

  const split = useMemo(() => {
    return splitMonthlyContributions(collectedThisMonth);
  }, [collectedThisMonth]);

  const alreadyWithdrawnThisMonth = useMemo(() => {
    if (!month) return false;
    return withdrawals.some((w) => w.month === month);
  }, [month, withdrawals]);

  const onchainAvailable = useMemo(() => {
    if (!onchain) return 0;
    const n = Number(onchain.withdrawableUSDC);
    return Number.isFinite(n) ? n : 0;
  }, [onchain]);

  const available = useMemo(() => {
    if (!month) return 0;
    if (!isNext) return 0;
    if (alreadyWithdrawnThisMonth) return 0;
    return split.distributionUSDC;
  }, [alreadyWithdrawnThisMonth, isNext, month, split.distributionUSDC]);

  const displayAvailable = onchain ? onchainAvailable : available;

  const canWithdraw =
    ready &&
    Boolean(voterId) &&
    Boolean(month) &&
    memberActive &&
    activeThisMonth &&
    (onchain ? onchainAvailable > 0 : isNext && available > 0);

  const fmt = useMemo(() => {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  }, []);

  const onWithdraw = () => {
    setError(null);
    setTxHash(null);
    if (!voterId) {
      setError("Login to withdraw.");
      return;
    }
    if (!memberActive) {
      setError("Only active members can withdraw.");
      return;
    }
    if (!month) {
      setError("Missing month context.");
      return;
    }
    if (!activeThisMonth) {
      setError("Check in for this month to withdraw.");
      return;
    }

    if (onchain) {
      if (onchainAvailable <= 0) {
        setError("Nothing withdrawable onchain.");
        return;
      }
      withdrawOnchain({ sessionId: voterId })
        .then((r) => {
          if (!r.ok) {
            setError(r.error);
            return;
          }
          setTxHash(r.hash);
        })
        .catch(() => setError("Transaction failed."));
      return;
    }

    if (!isNext) {
      setError("Only the next member can withdraw (demo).");
      return;
    }
    if (alreadyWithdrawnThisMonth) {
      setError("This month was already withdrawn.");
      return;
    }
    if (available <= 0) {
      setError("Nothing available this month.");
      return;
    }

    withdrawRotationAction({
      moaiId: moai.id,
      month,
      voterId,
      amountUSDC: available.toFixed(2),
    });
  };

  if (!ready) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Withdraw</h2>
          <p
            className="mt-2 text-lg font-semibold text-neutral-900"
            aria-live="polite"
          >
            {fmt.format(displayAvailable)} USDC available
          </p>
          <p className="mt-1 text-base text-neutral-600">
            {voterId
              ? !memberActive
                ? "You need to be a member to withdraw."
                : activeThisMonth
                  ? onchain
                    ? onchainAvailable > 0
                      ? "Ready to withdraw."
                      : "Nothing to withdraw right now."
                    : isNext
                      ? "It is your turn to receive funds."
                      : `Next in line: ${nextMember?.displayName ?? "—"}`
                  : "Please check in at this month's meeting first."
              : "Please sign in to withdraw."}
          </p>
        </div>

        {!voterId ? (
          <Link
            aria-label="Sign in to withdraw"
            className="text-base font-medium text-neutral-900 hover:underline"
            href="/auth"
          >
            Sign in
          </Link>
        ) : !activeThisMonth ? (
          <Link
            aria-label="Go to meetings to check in"
            className="text-base font-medium text-neutral-900 hover:underline"
            href="/moai/meetings"
          >
            Check in
          </Link>
        ) : null}
      </div>

      <div className="mt-4">
        <button
          aria-label="Withdraw available funds"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-neutral-900 px-5 py-3 text-base font-semibold text-white disabled:opacity-50"
          type="button"
          disabled={!canWithdraw}
          onClick={onWithdraw}
        >
          Withdraw
        </button>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-neutral-600">
          Details
        </summary>
        <div className="mt-2 space-y-1 text-sm text-neutral-600">
          <p>
            Collected this month:{" "}
            <span className="font-medium text-neutral-900">
              {fmt.format(collectedThisMonth)} USDC
            </span>
          </p>
          <p>
            70% to member:{" "}
            <span className="font-medium text-neutral-900">
              {fmt.format(split.distributionUSDC)} USDC
            </span>
          </p>
          <p>
            30% to emergency:{" "}
            <span className="font-medium text-neutral-900">
              {fmt.format(split.reserveUSDC)} USDC
            </span>
          </p>
        </div>
      </details>

      {txHash ? (
        <p className="mt-3 font-mono text-xs text-neutral-600">
          tx {txHash.slice(0, 10)}…{txHash.slice(-6)}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-base text-red-600" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
