"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContributionPayment } from "@/lib/contributions";
import { listContributionPaymentsByMoaiId } from "@/lib/contributions";
import type { MoaiRequest } from "@/lib/requests";
import { listRequestsByMoaiId } from "@/lib/requests";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";

function parseUSDC(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return n;
}

function sumUSDC(values: string[]): number {
  return values.reduce((sum, v) => sum + parseUSDC(v), 0);
}

export function PoolCard({ moaiId }: { moaiId: string }) {
  const [ready, setReady] = useState(false);
  const [payments, setPayments] = useState<ContributionPayment[]>([]);
  const [requests, setRequests] = useState<MoaiRequest[]>([]);

  const refresh = useCallback(() => {
    setPayments(listContributionPaymentsByMoaiId(moaiId));
    setRequests(listRequestsByMoaiId(moaiId));
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

  const balance = contributed - paidOut;

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
      </div>

      <p className="mt-3 text-sm text-neutral-600">
        Calculated locally for now.
      </p>
    </div>
  );
}
