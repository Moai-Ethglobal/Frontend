function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}
