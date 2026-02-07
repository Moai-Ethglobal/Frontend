"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContributionPayment } from "@/lib/contributions";
import { listContributionPaymentsByMoaiId } from "@/lib/contributions";
import { getMeeting } from "@/lib/meetings";
import type { MyMoai } from "@/lib/moai";
import type { MoaiRequest } from "@/lib/requests";
import { listRequestsByMoaiId } from "@/lib/requests";
import { rotationNextMember } from "@/lib/rotation";
import { readSession } from "@/lib/session";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import { monthKey } from "@/lib/time";
import { sumUSDC } from "@/lib/usdc";
import type { Withdrawal } from "@/lib/withdrawals";
import {
  createRotationWithdrawal,
  listWithdrawalsByMoaiId,
} from "@/lib/withdrawals";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function WithdrawCard({ moai }: { moai: MyMoai }) {
  const [ready, setReady] = useState(false);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [payments, setPayments] = useState<ContributionPayment[]>([]);
  const [requests, setRequests] = useState<MoaiRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const session = readSession();
    const id = session?.id ?? null;
    const m = monthKey(new Date());

    setVoterId(id);
    setMonth(m);
    setPayments(listContributionPaymentsByMoaiId(moai.id));
    setRequests(listRequestsByMoaiId(moai.id));
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

  const emergencyPaidOut = useMemo(() => {
    const executed = requests.filter(
      (r) => r.type === "emergency_withdrawal" && Boolean(r.executedAt),
    );
    return sumUSDC(
      executed.map((r) =>
        r.type === "emergency_withdrawal" ? r.amountUSDC : "0",
      ),
    );
  }, [requests]);

  const contributed = useMemo(() => {
    return sumUSDC(payments.map((p) => p.amountUSDC));
  }, [payments]);

  const withdrawn = useMemo(() => {
    return sumUSDC(withdrawals.map((w) => w.amountUSDC));
  }, [withdrawals]);

  const balance = useMemo(() => {
    return round2(contributed - emergencyPaidOut - withdrawn);
  }, [contributed, emergencyPaidOut, withdrawn]);

  const activeThisMonth = Boolean(checkedInAt);

  const nextMember = useMemo(() => {
    if (!month) return null;
    return rotationNextMember(moai, month);
  }, [moai, month]);

  const isNext =
    Boolean(voterId) && Boolean(nextMember) && voterId === nextMember?.id;

  const canWithdraw =
    ready &&
    Boolean(voterId) &&
    Boolean(month) &&
    activeThisMonth &&
    isNext &&
    balance > 0;

  const fmt = useMemo(() => {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  }, []);

  const onWithdraw = () => {
    setError(null);
    if (!voterId) {
      setError("Login to withdraw.");
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
    if (!isNext) {
      setError("Only the next member can withdraw (demo).");
      return;
    }
    if (balance <= 0) {
      setError("No balance available.");
      return;
    }

    createRotationWithdrawal({
      moaiId: moai.id,
      month,
      voterId,
      amountUSDC: balance.toFixed(2),
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
              {fmt.format(balance)} USDC
            </span>
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Eligible:{" "}
            <span className="font-medium text-neutral-900">
              {voterId
                ? activeThisMonth
                  ? isNext
                    ? "yes"
                    : `next is ${nextMember?.displayName ?? "—"}`
                  : "check in required"
                : "login required"}
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
          Withdraw (mock)
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
