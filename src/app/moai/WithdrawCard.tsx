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
    <div className="mt-10 rounded-xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Withdraw</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Available:{" "}
            <span className="font-medium text-neutral-900">
              {fmt.format(displayAvailable)} USDC
            </span>
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Eligible:{" "}
            <span className="font-medium text-neutral-900">
              {voterId
                ? !memberActive
                  ? "member required"
                  : activeThisMonth
                    ? onchain
                      ? onchainAvailable > 0
                        ? "yes"
                        : "no"
                      : isNext
                        ? "yes"
                        : `next is ${nextMember?.displayName ?? "—"}`
                    : "check in required"
                : "login required"}
            </span>
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            This month collected:{" "}
            <span className="font-medium text-neutral-900">
              {fmt.format(collectedThisMonth)} USDC
            </span>
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Split:{" "}
            <span className="font-medium text-neutral-900">
              {fmt.format(split.distributionUSDC)} USDC to member ·{" "}
              {fmt.format(split.reserveUSDC)} USDC to emergency
            </span>
          </p>
        </div>

        {!voterId ? (
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/auth"
          >
            Login
          </Link>
        ) : !activeThisMonth ? (
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai/meetings"
          >
            Check in
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">Stored locally for now.</p>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={!canWithdraw}
          onClick={onWithdraw}
        >
          {onchain ? "Withdraw onchain" : "Withdraw (mock)"}
        </button>
      </div>

      {txHash ? (
        <p className="mt-3 font-mono text-xs text-neutral-600">
          tx {txHash.slice(0, 10)}…{txHash.slice(-6)}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
