import { createSmartAccountClient } from "permissionless";
import { toKernelSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import type { Address } from "viem";
import { createPublicClient, defineChain, http } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import {
  generatePrivateKey,
  type LocalAccount,
  privateKeyToAccount,
} from "viem/accounts";
import { readAaConfig } from "./aaConfig";
import { readJson, writeJson } from "./storage";

const OWNER_KEY_PREFIX = "moai.aa.ownerKey.v1:";
const KERNEL_ADDR_PREFIX = "moai.aa.kernelAddress.v1:";

function ownerKeyKey(identityId: string): string {
  return `${OWNER_KEY_PREFIX}${identityId.trim()}`;
}

function kernelAddrKey(identityId: string, chainId: number): string {
  return `${KERNEL_ADDR_PREFIX}${chainId}:${identityId.trim()}`;
}

function asHex(value: unknown): `0x${string}` | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v.startsWith("0x")) return null;
  if (v.length < 10) return null;
  return v as `0x${string}`;
}

function getOrCreateOwnerPrivateKey(identityId: string): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  const key = ownerKeyKey(identityId);
  const existing = asHex(readJson<unknown>(key));
  if (existing) return existing;

  const pk = generatePrivateKey();
  writeJson(key, pk);
  return pk;
}

export function getEmbeddedOwnerAccount(
  identityId: string,
): LocalAccount | null {
  const pk = getOrCreateOwnerPrivateKey(identityId);
  if (!pk) return null;
  try {
    return privateKeyToAccount(pk);
  } catch {
    return null;
  }
}

export async function getKernelAccountAddress(input: {
  identityId: string;
}): Promise<Address | null> {
  const cfg = readAaConfig();
  if (!cfg) return null;

  const cached = readJson<unknown>(
    kernelAddrKey(input.identityId, cfg.chainId),
  );
  const cachedAddr = asHex(cached);
  if (cachedAddr) return cachedAddr as Address;

  const owner = getEmbeddedOwnerAccount(input.identityId);
  if (!owner) return null;

  const chain = defineChain({
    id: cfg.chainId,
    name: `Moai chain ${cfg.chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [cfg.rpcUrl] },
    },
    blockExplorers: {
      default: { name: "Explorer", url: "" },
    },
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(cfg.rpcUrl),
  });

  const kernelAccount = await toKernelSmartAccount({
    client: publicClient,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    owners: [owner],
    index: 0n,
  });

  const addr = kernelAccount.address as Address;
  writeJson(kernelAddrKey(input.identityId, cfg.chainId), addr);
  return addr;
}

export async function getAaClients(input: { identityId: string }): Promise<{
  owner: LocalAccount;
  smartAccountAddress: Address;
  smartAccountClient: ReturnType<typeof createSmartAccountClient>;
  publicClient: ReturnType<typeof createPublicClient>;
} | null> {
  const cfg = readAaConfig();
  if (!cfg) return null;

  const owner = getEmbeddedOwnerAccount(input.identityId);
  if (!owner) return null;

  const chain = defineChain({
    id: cfg.chainId,
    name: `Moai chain ${cfg.chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [cfg.rpcUrl] },
    },
    blockExplorers: {
      default: { name: "Explorer", url: "" },
    },
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(cfg.rpcUrl),
  });

  const pimlicoClient = createPimlicoClient({
    transport: http(cfg.pimlicoUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const kernelAccount = await toKernelSmartAccount({
    client: publicClient,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    owners: [owner],
    index: 0n,
  });

  const smartAccountClient = createSmartAccountClient({
    account: kernelAccount,
    chain,
    bundlerTransport: http(cfg.pimlicoUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });

  const smartAccountAddress = kernelAccount.address as Address;
  writeJson(kernelAddrKey(input.identityId, cfg.chainId), smartAccountAddress);

  return {
    owner,
    smartAccountAddress,
    smartAccountClient,
    publicClient,
  };
}

export async function signAaMessage(input: {
  identityId: string;
  message: string;
}): Promise<`0x${string}` | null> {
  const owner = getEmbeddedOwnerAccount(input.identityId);
  if (!owner) return null;
  try {
    const sig = await owner.signMessage({ message: input.message });
    return typeof sig === "string" ? (sig as `0x${string}`) : null;
  } catch {
    return null;
  }
}
