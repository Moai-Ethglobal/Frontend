import { readJson, writeJson } from "./storage";

export type RotationWithdrawal = {
  id: string;
  moaiId: string;
  month: string;
  voterId: string;
  amountUSDC: string;
  withdrawnAt: string;
  receiptId: string;
  kind: "rotation";
};

export type Withdrawal = RotationWithdrawal;

const STORAGE_KEY = "moai.withdrawals.v1";

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `wd:${Date.now()}`;
}

function readAll(): Withdrawal[] {
  return readJson<Withdrawal[]>(STORAGE_KEY) ?? [];
}

function writeAll(value: Withdrawal[]): void {
  writeJson(STORAGE_KEY, value);
}

export function listWithdrawalsByMoaiId(moaiId: string): Withdrawal[] {
  return readAll()
    .filter((w) => w.moaiId === moaiId)
    .sort((a, b) => b.withdrawnAt.localeCompare(a.withdrawnAt));
}

export function createRotationWithdrawal(input: {
  moaiId: string;
  month: string;
  voterId: string;
  amountUSDC: string;
}): RotationWithdrawal {
  const id = makeId();
  const receiptId =
    globalThis.crypto?.randomUUID?.() ?? `wd:${Date.now()}:${input.moaiId}`;

  const withdrawal: RotationWithdrawal = {
    id,
    moaiId: input.moaiId,
    month: input.month,
    voterId: input.voterId,
    amountUSDC: input.amountUSDC.trim(),
    withdrawnAt: new Date().toISOString(),
    receiptId,
    kind: "rotation",
  };

  writeAll([withdrawal, ...readAll()]);
  return withdrawal;
}
