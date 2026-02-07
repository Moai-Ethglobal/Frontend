export function parseUSDC(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return n;
}

export function sumUSDC(values: string[]): number {
  return values.reduce((sum, v) => sum + parseUSDC(v), 0);
}
