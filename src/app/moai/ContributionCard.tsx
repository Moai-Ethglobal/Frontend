"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { payContributionAction } from "@/lib/actions";
import type { ContributionPayment } from "@/lib/contributions";
import { getContributionPayment } from "@/lib/contributions";
import { isActiveMemberId, type MyMoai } from "@/lib/moai";
import { contributeOnchain, readOnchainMoaiState } from "@/lib/onchainMoai";
import { readSession } from "@/lib/session";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";
import { monthKey } from "@/lib/time";

export function ContributionCard({ moai }: { moai: MyMoai }) {
  const [ready, setReady] = useState(false);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [payment, setPayment] = useState<ContributionPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onchain, setOnchain] = useState<Awaited<
    ReturnType<typeof readOnchainMoaiState>
  > | null>(null);
  const [onchainError, setOnchainError] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const session = readSession();
    const nextVoterId = session?.id ?? null;
    const nextMonth = monthKey(new Date());

    setVoterId(nextVoterId);
    setMonth(nextMonth);
    setPayment(
      nextVoterId
        ? getContributionPayment({
            moaiId: moai.id,
            month: nextMonth,
            voterId: nextVoterId,
          })
        : null,
    );

    const nextOnchain = await readOnchainMoaiState({ sessionId: nextVoterId });
    setOnchain(nextOnchain);
    setReady(true);
  }, [moai.id]);

  useEffect(() => {
    void refresh();

    const onChanged = (evt: Event) => {
      const detail = (evt as CustomEvent<StorageChangeDetail>).detail;
      if (!detail?.key) return;
      if (
        detail.key !== "moai.session.v1" &&
        detail.key !== "moai.onchain.v1" &&
        detail.key !== "moai.contributions.v1"
      )
        return;
      void refresh();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, onChanged);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onChanged);
  }, [refresh]);

  const monthly = moai.monthlyContributionUSDC?.trim();
  const outstandingUSDC =
    monthly && monthly.length > 0 && !payment ? monthly : "0";

  const memberActive = Boolean(voterId && isActiveMemberId(moai, voterId));

  const canPay =
    ready &&
    Boolean(monthly) &&
    monthly?.length &&
    Boolean(voterId) &&
    memberActive &&
    Boolean(month) &&
    !payment;

  const onPay = () => {
    setError(null);
    setTxHashes([]);
    if (!voterId) {
      setError("Login to pay.");
      return;
    }
    if (!memberActive) {
      setError("Only active members can pay.");
      return;
    }
    if (!month) {
      setError("Missing month context.");
      return;
    }
    if (!monthly || monthly.trim().length === 0) {
      setError("Monthly contribution is not set.");
      return;
    }

    setPayment(
      payContributionAction({
        moaiId: moai.id,
        month,
        voterId,
        amountUSDC: monthly,
      }),
    );
  };

  const onPayOnchain = async () => {
    setOnchainError(null);
    setTxHashes([]);
    const result = await contributeOnchain({ sessionId: voterId });
    if (!result.ok) {
      setOnchainError(result.error);
      return;
    }
    setTxHashes([...result.hashes]);
    void refresh();
  };

  const canPayOnchain = useMemo(() => {
    return Boolean(onchain?.isMember && !onchain.paidThisMonth);
  }, [onchain?.isMember, onchain?.paidThisMonth]);

  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Monthly payment</h2>
          <p className="mt-2 text-base text-neutral-700" aria-live="polite">
            Amount:{" "}
            <span className="font-semibold text-neutral-900">
              {monthly && monthly.length > 0 ? `${monthly} USDC` : "Not set"}
            </span>
          </p>
          {month ? (
            <p className="mt-1 text-base text-neutral-700" aria-live="polite">
              {payment
                ? "This month: paid"
                : `Due this month: ${outstandingUSDC} USDC`}
            </p>
          ) : null}
        </div>

        {!voterId ? (
          <Link
            aria-label="Sign in to pay"
            className="text-base font-medium text-neutral-900 hover:underline"
            href="/auth"
          >
            Sign in
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          aria-label="Pay monthly contribution (local demo)"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-neutral-900 px-5 py-3 text-base font-semibold text-white disabled:opacity-50"
          type="button"
          disabled={!canPay}
          onClick={onPay}
        >
          Pay now
        </button>

        <button
          aria-label="Pay monthly contribution on the blockchain"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-neutral-200 px-5 py-3 text-base font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
          type="button"
          disabled={!canPayOnchain}
          onClick={() => void onPayOnchain()}
        >
          Pay onchain
        </button>
      </div>

      {onchain ? (
        <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
          <p className="text-xs font-medium text-neutral-700">Onchain status</p>
          <p className="mt-2">
            Contribution:{" "}
            <span className="font-medium text-neutral-900">
              {onchain.contributionAmountUSDC} USDC
            </span>
          </p>
          <p className="mt-1">
            Month:{" "}
            <span className="font-medium text-neutral-900">
              {onchain.currentMonth.toString()}
            </span>{" "}
            <span className="text-neutral-600">
              ({onchain.paidThisMonth ? "paid" : "unpaid"})
            </span>
          </p>
        </div>
      ) : null}

      {payment ? (
        <p className="mt-3 text-sm text-neutral-600">
          Paid at {new Date(payment.paidAt).toLocaleString(undefined)}.
        </p>
      ) : null}

      {txHashes.length > 0 ? (
        <div className="mt-3 text-xs text-neutral-600">
          {txHashes.map((h) => (
            <p className="font-mono" key={h}>
              tx {h.slice(0, 10)}…{h.slice(-6)}
            </p>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {onchainError ? (
        <p className="mt-3 text-sm text-red-600">{onchainError}</p>
      ) : null}
    </div>
  );
}
