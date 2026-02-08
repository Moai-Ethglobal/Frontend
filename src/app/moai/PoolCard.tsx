"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContributionPayment } from "@/lib/contributions";
import { listContributionPaymentsByMoaiId } from "@/lib/contributions";
import { splitMonthlyContributions } from "@/lib/economics";
import { poolBreakdown } from "@/lib/pool";
import type { MoaiRequest } from "@/lib/requests";
import { listRequestsByMoaiId } from "@/lib/requests";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import { monthKey } from "@/lib/time";
import { sumUSDC } from "@/lib/usdc";
import type { Withdrawal } from "@/lib/withdrawals";
import { listWithdrawalsByMoaiId } from "@/lib/withdrawals";

export function PoolCard({ moaiId }: { moaiId: string }) {
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState<string | null>(null);
  const [payments, setPayments] = useState<ContributionPayment[]>([]);
  const [requests, setRequests] = useState<MoaiRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const refresh = useCallback(() => {
    setMonth(monthKey(new Date()));
    setPayments(listContributionPaymentsByMoaiId(moaiId));
    setRequests(listRequestsByMoaiId(moaiId));
    setWithdrawals(listWithdrawalsByMoaiId(moaiId));
    setReady(true);
  }, [moaiId]);

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

  const executed = useMemo(() => {
    return requests.filter(
      (r) => r.type === "emergency_withdrawal" && Boolean(r.executedAt),
    );
  }, [requests]);

  const contributed = useMemo(() => {
    return sumUSDC(payments.map((p) => p.amountUSDC));
  }, [payments]);

  const paidOut = useMemo(() => {
    return sumUSDC(
      executed.map((r) =>
        r.type === "emergency_withdrawal" ? r.amountUSDC : "0",
      ),
    );
  }, [executed]);

  const withdrawn = useMemo(() => {
    return sumUSDC(withdrawals.map((w) => w.amountUSDC));
  }, [withdrawals]);

  const balance = contributed - paidOut - withdrawn;

  const breakdown = useMemo(() => {
    if (!month) return null;
    return poolBreakdown({ moaiId, month, payments, requests, withdrawals });
  }, [moaiId, month, payments, requests, withdrawals]);

  const monthCollectedUSDC = useMemo(() => {
    if (!month) return 0;
    return sumUSDC(
      payments.filter((p) => p.month === month).map((p) => p.amountUSDC),
    );
  }, [month, payments]);

  const split = useMemo(() => {
    return splitMonthlyContributions(monthCollectedUSDC);
  }, [monthCollectedUSDC]);

  const fmt = useMemo(() => {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  }, []);

  if (!ready) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-xl border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold">Pool</h2>
      <p className="mt-2 text-sm text-neutral-700">
        Balance:{" "}
        <span className="font-medium text-neutral-900">
          {fmt.format(balance)} USDC
        </span>
      </p>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600">
        <span>
          Contributed: {fmt.format(contributed)} USDC ({payments.length})
        </span>
        <span>
          Paid out: {fmt.format(paidOut)} USDC ({executed.length})
        </span>
        <span>
          Withdrawn: {fmt.format(withdrawn)} USDC ({withdrawals.length})
        </span>
      </div>

      <p className="mt-3 text-sm text-neutral-600">
        Calculated locally for now.
      </p>

      <div className="mt-6 border-t border-neutral-200 pt-4">
        <h3 className="text-sm font-semibold">This month split</h3>
        <p className="mt-2 text-sm text-neutral-700">
          Month:{" "}
          <span className="font-medium text-neutral-900">{month ?? "—"}</span>
        </p>
        <p className="mt-2 text-sm text-neutral-700">
          Collected:{" "}
          <span className="font-medium text-neutral-900">
            {fmt.format(monthCollectedUSDC)} USDC
          </span>
        </p>
        <p className="mt-1 text-sm text-neutral-700">
          Round robin (70%):{" "}
          <span className="font-medium text-neutral-900">
            {fmt.format(split.distributionUSDC)} USDC
          </span>
        </p>
        <p className="mt-1 text-sm text-neutral-700">
          Emergency reserve (30%):{" "}
          <span className="font-medium text-neutral-900">
            {fmt.format(split.reserveUSDC)} USDC
          </span>
        </p>

        {breakdown ? (
          <p className="mt-2 text-sm text-neutral-700">
            Emergency reserve available:{" "}
            <span className="font-medium text-neutral-900">
              {fmt.format(breakdown.emergencyReserveUSDC)} USDC
            </span>
          </p>
        ) : null}

        <p className="mt-3 text-sm text-neutral-600">
          Yield strategies are a future add-on.
        </p>
      </div>
    </div>
  );
}
