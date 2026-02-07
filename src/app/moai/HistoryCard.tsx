"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContributionPayment } from "@/lib/contributions";
import { listContributionPaymentsByMoaiId } from "@/lib/contributions";
import type { EmergencyWithdrawalRequest, MoaiRequest } from "@/lib/requests";
import { listRequestsByMoaiId } from "@/lib/requests";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import type { Withdrawal } from "@/lib/withdrawals";
import { listWithdrawalsByMoaiId } from "@/lib/withdrawals";

type HistoryItem =
  | {
      type: "contribution_paid";
      ts: string;
      title: string;
      detail: string;
    }
  | {
      type: "emergency_executed";
      ts: string;
      title: string;
      detail: string;
    }
  | {
      type: "withdrawn";
      ts: string;
      title: string;
      detail: string;
    };

function isoTime(value: string): number {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

function formatDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString(undefined);
}

function toContributionItem(p: ContributionPayment): HistoryItem {
  return {
    type: "contribution_paid",
    ts: p.paidAt,
    title: "Contribution paid",
    detail: `${p.month} · ${p.amountUSDC} USDC`,
  };
}

function toExecutedItem(r: EmergencyWithdrawalRequest): HistoryItem {
  return {
    type: "emergency_executed",
    ts: r.executedAt ?? r.createdAt,
    title: "Emergency payout executed",
    detail: `${r.amountUSDC} USDC · ${r.beneficiaryName}`,
  };
}

function toWithdrawalItem(w: Withdrawal): HistoryItem {
  return {
    type: "withdrawn",
    ts: w.withdrawnAt,
    title: "Withdrawal",
    detail: `${w.month} · ${w.amountUSDC} USDC`,
  };
}

function executedEmergencyRequests(
  requests: MoaiRequest[],
): EmergencyWithdrawalRequest[] {
  return requests
    .filter(
      (r): r is EmergencyWithdrawalRequest =>
        r.type === "emergency_withdrawal" && Boolean(r.executedAt),
    )
    .sort(
      (a, b) =>
        isoTime(b.executedAt ?? b.createdAt) -
        isoTime(a.executedAt ?? a.createdAt),
    );
}

export function HistoryCard({ moaiId }: { moaiId: string }) {
  const [ready, setReady] = useState(false);
  const [payments, setPayments] = useState<ContributionPayment[]>([]);
  const [requests, setRequests] = useState<MoaiRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const refresh = useCallback(() => {
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
      if (
        detail.key !== "moai.contributions.v1" &&
        detail.key !== "moai.requests.v1" &&
        detail.key !== "moai.withdrawals.v1"
      )
        return;
      refresh();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, onChanged);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onChanged);
  }, [refresh]);

  const items = useMemo(() => {
    const executed = executedEmergencyRequests(requests);
    const next: HistoryItem[] = [
      ...payments.map(toContributionItem),
      ...executed.map(toExecutedItem),
      ...withdrawals.map(toWithdrawalItem),
    ];
    return next.sort((a, b) => isoTime(b.ts) - isoTime(a.ts)).slice(0, 6);
  }, [payments, requests, withdrawals]);

  if (!ready) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-xl border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold">History</h2>
      <p className="mt-2 text-sm text-neutral-700">Recent activity.</p>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">No activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((it) => (
            <li className="text-sm" key={`${it.type}:${it.ts}:${it.detail}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-neutral-900">{it.title}</p>
                  <p className="mt-0.5 text-neutral-700">{it.detail}</p>
                </div>
                <span className="shrink-0 text-neutral-600">
                  {formatDate(it.ts)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-sm text-neutral-600">Stored locally for now.</p>
    </div>
  );
}
