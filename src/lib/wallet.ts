export type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type WalletCapabilities = Record<string, unknown>;

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

export async function requestChainId(): Promise<number | null> {
  const provider = getWalletProvider();
  if (!provider) return null;
  try {
    const result = await provider.request({ method: "eth_chainId" });
    if (typeof result !== "string") return null;
    if (!result.startsWith("0x")) return null;
    const id = Number.parseInt(result, 16);
    if (!Number.isFinite(id)) return null;
    return id;
  } catch {
    return null;
  }
}

export async function requestWalletCapabilities(input: {
  account: string;
  chainId?: number;
}): Promise<WalletCapabilities | null> {
  const provider = getWalletProvider();
  if (!provider) return null;

  const account = input.account.trim();
  if (account.length === 0) return null;

  const params = [
    input.chainId ? { account, chainId: input.chainId } : { account },
  ];

  try {
    const result = await provider.request({
      method: "wallet_getCapabilities",
      params,
    });
    if (!result || typeof result !== "object") return null;
    return result as WalletCapabilities;
  } catch {
    return null;
  }
}
