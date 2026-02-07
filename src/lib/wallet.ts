export type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function getWalletProvider(): WalletProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: unknown }).ethereum as
    | { request?: unknown }
    | undefined;
  if (!eth || typeof eth.request !== "function") return null;
  return eth as WalletProvider;
}

export async function requestWalletAccounts(): Promise<string[] | null> {
  const provider = getWalletProvider();
  if (!provider) return null;
  try {
    const result = await provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(result)) return null;
    if (!result.every((x) => typeof x === "string")) return null;
    return result as string[];
  } catch {
    return null;
  }
}
