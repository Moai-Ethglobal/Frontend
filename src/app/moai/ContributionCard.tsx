"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { payContributionAction } from "@/lib/actions";
import type { ContributionPayment } from "@/lib/contributions";
import { getContributionPayment } from "@/lib/contributions";
import { isActiveMemberId, type MyMoai } from "@/lib/moai";
import { readSession } from "@/lib/session";
import { monthKey } from "@/lib/time";

export function ContributionCard({ moai }: { moai: MyMoai }) {
  const [ready, setReady] = useState(false);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [payment, setPayment] = useState<ContributionPayment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    setReady(true);
  }, [moai.id]);

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

  return (
    <div className="mt-10 rounded-xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Contribution</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Monthly:{" "}
            <span className="font-medium text-neutral-900">
              {monthly && monthly.length > 0 ? `${monthly} USDC` : "Not set"}
            </span>
          </p>
          {month ? (
            <p className="mt-1 text-sm text-neutral-700">
              This month ({month}):{" "}
              <span className="font-medium text-neutral-900">
                {payment ? "paid" : `outstanding ${outstandingUSDC} USDC`}
              </span>
            </p>
          ) : null}
        </div>

        {!voterId ? (
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/auth"
          >
            Login
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">Stored locally for now.</p>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={!canPay}
          onClick={onPay}
        >
          Pay (mock)
        </button>
      </div>

      {payment ? (
        <p className="mt-3 text-sm text-neutral-600">
          Paid at {new Date(payment.paidAt).toLocaleString(undefined)}.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
