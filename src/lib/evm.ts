export function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function shortEvmAddress(address: string): string {
  const a = address.trim();
  if (!isEvmAddress(a)) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
