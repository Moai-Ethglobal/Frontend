export const DISTRIBUTION_PERCENT = 70;
export const EMERGENCY_RESERVE_PERCENT = 30;

export type Split = {
  distributionUSDC: number;
  reserveUSDC: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function splitMonthlyContributions(totalUSDC: number): Split {
  const total = Number.isFinite(totalUSDC) && totalUSDC > 0 ? totalUSDC : 0;
  const distribution = round2((total * DISTRIBUTION_PERCENT) / 100);
  const reserve = round2(total - distribution);
  return { distributionUSDC: distribution, reserveUSDC: reserve };
}
