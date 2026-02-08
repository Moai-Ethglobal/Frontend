export type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type WalletCapabilities = Record<string, unknown>;

type EthereumProviderLike = {
  request?: unknown;
  isMetaMask?: boolean;
};

type EthereumLike = EthereumProviderLike & {
  providers?: unknown;
};

function asProvider(value: unknown): WalletProvider | null {
  if (!value || typeof value !== "object") return null;
  const v = value as EthereumProviderLike;
  if (typeof v.request !== "function") return null;
  return v as WalletProvider;
}

export function getWalletProvider(): WalletProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: unknown }).ethereum as
    | EthereumLike
    | undefined;
  if (!eth) return null;

  // Some browsers (e.g. Brave) expose multiple injected providers.
  const rawProviders = Array.isArray(eth.providers)
    ? (eth.providers as unknown[])
    : [eth];
  const providers = rawProviders.map(asProvider).filter(Boolean);
  if (providers.length === 0) return null;

  const metamask = rawProviders.find((p) => {
    if (!p || typeof p !== "object") return false;
    return (p as EthereumProviderLike).isMetaMask === true;
  });

  return asProvider(metamask) ?? providers[0] ?? null;
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

export type RequestWalletAccountsResult =
  | { ok: true; accounts: string[] }
  | { ok: false; error: string };

function asEip1193Error(value: unknown): { code?: number; message?: string } {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const code = typeof v.code === "number" ? v.code : undefined;
  const message = typeof v.message === "string" ? v.message : undefined;
  return { code, message };
}

function friendlyWalletError(value: unknown): string {
  const e = asEip1193Error(value);
  if (e.code === 4001) return "Request rejected in wallet.";
  if (e.code === -32002)
    return "A wallet request is already pending. Open your wallet to continue.";
  if (e.message?.trim()) return e.message.trim();
  return "Unable to connect wallet.";
}

export async function requestWalletAccountsDetailed(): Promise<RequestWalletAccountsResult> {
  const provider = getWalletProvider();
  if (!provider) {
    return {
      ok: false,
      error:
        "No wallet provider detected. If you're on Brave, enable MetaMask as your injected wallet.",
    };
  }

  try {
    const result = await provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(result)) {
      return { ok: false, error: "Invalid wallet response." };
    }
    if (!result.every((x) => typeof x === "string")) {
      return { ok: false, error: "Invalid wallet response." };
    }
    const accounts = (result as string[]).map((a) => a.trim()).filter(Boolean);
    if (accounts.length === 0)
      return { ok: false, error: "No accounts found." };
    return { ok: true, accounts };
  } catch (err) {
    return { ok: false, error: friendlyWalletError(err) };
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

export async function signMessage(input: {
  account: string;
  message: string;
}): Promise<string | null> {
  const provider = getWalletProvider();
  if (!provider) return null;

  const account = input.account.trim();
  const message = input.message;
  if (!account.length || !message.length) return null;

  const tryRequest = async (params: unknown[]) => {
    const result = await provider.request({
      method: "personal_sign",
      params,
    });
    return typeof result === "string" ? result : null;
  };

  try {
    // MetaMask: [message, address]
    const sig = await tryRequest([message, account]);
    if (sig) return sig;
  } catch {
    // ignore
  }

  try {
    // Some wallets: [address, message]
    const sig = await tryRequest([account, message]);
    if (sig) return sig;
  } catch {
    // ignore
  }

  try {
    const result = await provider.request({
      method: "eth_sign",
      params: [account, message],
    });
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}
