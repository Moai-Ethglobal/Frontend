import type { ContributionPayment } from "./contributions";
import { listContributionPaymentsByMoaiId } from "./contributions";
import { splitMonthlyContributions } from "./economics";
import type { EmergencyWithdrawalRequest, MoaiRequest } from "./requests";
import { listRequestsByMoaiId } from "./requests";
import { sumUSDC } from "./usdc";
import type { Withdrawal } from "./withdrawals";
import { listWithdrawalsByMoaiId } from "./withdrawals";

export type PoolBreakdown = {
  contributedTotalUSDC: number;
  paidOutEmergencyUSDC: number;
  withdrawnDistributionUSDC: number;
  balanceTotalUSDC: number;

  emergencyReserveUSDC: number;
  distributionForMonthUSDC: number;
};

function executedEmergencyRequests(
  requests: MoaiRequest[],
): EmergencyWithdrawalRequest[] {
  return requests.filter(
    (r): r is EmergencyWithdrawalRequest =>
      r.type === "emergency_withdrawal" && Boolean(r.executedAt),
  );
}

export function monthCollectedUSDC(input: {
  moaiId: string;
  month: string;
  payments?: ContributionPayment[];
}): number {
  const payments =
    input.payments ?? listContributionPaymentsByMoaiId(input.moaiId);
  return sumUSDC(
    payments.filter((p) => p.month === input.month).map((p) => p.amountUSDC),
  );
}

export function emergencyReserveUSDC(input: {
  moaiId: string;
  payments?: ContributionPayment[];
  requests?: MoaiRequest[];
}): number {
  const payments =
    input.payments ?? listContributionPaymentsByMoaiId(input.moaiId);
  const requests = input.requests ?? listRequestsByMoaiId(input.moaiId);

  const byMonth = new Map<string, number>();
  for (const p of payments) {
    byMonth.set(p.month, (byMonth.get(p.month) ?? 0) + Number(p.amountUSDC));
  }

  let allocated = 0;
  for (const [, total] of byMonth) {
    const split = splitMonthlyContributions(Number.isFinite(total) ? total : 0);
    allocated += split.reserveUSDC;
  }

  const executed = executedEmergencyRequests(requests);
  const paidOut = sumUSDC(executed.map((r) => r.amountUSDC));

  return Math.max(0, Math.round((allocated - paidOut) * 100) / 100);
}

export function poolBreakdown(input: {
  moaiId: string;
  month: string;
  payments?: ContributionPayment[];
  requests?: MoaiRequest[];
  withdrawals?: Withdrawal[];
}): PoolBreakdown {
  const payments =
    input.payments ?? listContributionPaymentsByMoaiId(input.moaiId);
  const requests = input.requests ?? listRequestsByMoaiId(input.moaiId);
  const withdrawals =
    input.withdrawals ?? listWithdrawalsByMoaiId(input.moaiId);

  const executed = executedEmergencyRequests(requests);

  const contributedTotalUSDC = sumUSDC(payments.map((p) => p.amountUSDC));
  const paidOutEmergencyUSDC = sumUSDC(executed.map((r) => r.amountUSDC));
  const withdrawnDistributionUSDC = sumUSDC(
    withdrawals.map((w) => w.amountUSDC),
  );

  const balanceTotalUSDC =
    contributedTotalUSDC - paidOutEmergencyUSDC - withdrawnDistributionUSDC;

  const collectedMonthUSDC = monthCollectedUSDC({
    moaiId: input.moaiId,
    month: input.month,
    payments,
  });
  const split = splitMonthlyContributions(collectedMonthUSDC);

  return {
    contributedTotalUSDC,
    paidOutEmergencyUSDC,
    withdrawnDistributionUSDC,
    balanceTotalUSDC,
    emergencyReserveUSDC: emergencyReserveUSDC({
      moaiId: input.moaiId,
      payments,
      requests,
    }),
    distributionForMonthUSDC: split.distributionUSDC,
  };
}
