import { readJson, writeJson } from "./storage";

export type ContributionPayment = {
  moaiId: string;
  month: string;
  voterId: string;
  amountUSDC: string;
  paidAt: string;
};

const STORAGE_KEY = "moai.contributions.v1";

function readAll(): ContributionPayment[] {
  return readJson<ContributionPayment[]>(STORAGE_KEY) ?? [];
}

function writeAll(value: ContributionPayment[]): void {
  writeJson(STORAGE_KEY, value);
}

export function getContributionPayment(input: {
  moaiId: string;
  month: string;
  voterId: string;
}): ContributionPayment | null {
  return (
    readAll().find(
      (p) =>
        p.moaiId === input.moaiId &&
        p.month === input.month &&
        p.voterId === input.voterId,
    ) ?? null
  );
}

export function markContributionPaid(input: {
  moaiId: string;
  month: string;
  voterId: string;
  amountUSDC: string;
}): ContributionPayment {
  const amount = input.amountUSDC.trim();

  const payment: ContributionPayment = {
    moaiId: input.moaiId,
    month: input.month,
    voterId: input.voterId,
    amountUSDC: amount.length > 0 ? amount : "0",
    paidAt: new Date().toISOString(),
  };

  const all = readAll();
  writeAll([
    payment,
    ...all.filter(
      (p) =>
        !(
          p.moaiId === input.moaiId &&
          p.month === input.month &&
          p.voterId === input.voterId
        ),
    ),
  ]);

  return payment;
}
