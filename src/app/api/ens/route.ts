import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { namehash, normalize, parseAvatarRecord } from "viem/ens";
import { isEvmAddress } from "@/lib/evm";

const DEFAULT_MAINNET_RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com",
] as const;

const ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ENS_REGISTRY_ABI = [
  {
    type: "function",
    name: "resolver",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "resolver", type: "address" }],
  },
] as const;

const REVERSE_RESOLVER_ABI = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "name", type: "string" }],
  },
] as const;

const TEXT_RESOLVER_ABI = [
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "value", type: "string" }],
  },
] as const;

type EnsResult = { name: string | null; avatar: string | null };

type CacheEntry = {
  value: EnsResult;
  expiresAt: number;
};

const ENS_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_OK_MS = 60 * 60 * 1000;
const CACHE_TTL_FAIL_MS = 30 * 1000;

function getRpcCandidates(): string[] {
  const candidates = [
    process.env.ENS_RPC_URL,
    process.env.MAINNET_RPC_URL,
    ...DEFAULT_MAINNET_RPCS,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0);

  return Array.from(new Set(candidates));
}

function toAddressLower(value: string): `0x${string}` {
  return value.trim().toLowerCase() as `0x${string}`;
}

async function resolveEnsWithClient(input: {
  publicClient: ReturnType<typeof createPublicClient>;
  address: `0x${string}`;
}): Promise<EnsResult> {
  const reverseName = `${input.address.slice(2)}.addr.reverse`;
  const reverseNode = namehash(reverseName);

  const resolver = (await input.publicClient.readContract({
    address: ENS_REGISTRY_ADDRESS,
    abi: ENS_REGISTRY_ABI,
    functionName: "resolver",
    args: [reverseNode],
  })) as string;

  if (!isEvmAddress(resolver) || resolver.toLowerCase() === ZERO_ADDRESS) {
    return { name: null, avatar: null };
  }

  const name = await input.publicClient
    .readContract({
      address: resolver as `0x${string}`,
      abi: REVERSE_RESOLVER_ABI,
      functionName: "name",
      args: [reverseNode],
    })
    .then((v) => (typeof v === "string" ? v.trim() : ""))
    .catch(() => "");

  if (!name.length) return { name: null, avatar: null };

  let normalized: string;
  try {
    normalized = normalize(name);
  } catch {
    return { name, avatar: null };
  }

  const node = namehash(normalized);
  const nameResolver = (await input.publicClient
    .readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ENS_REGISTRY_ABI,
      functionName: "resolver",
      args: [node],
    })
    .catch(() => ZERO_ADDRESS)) as string;

  if (
    !isEvmAddress(nameResolver) ||
    nameResolver.toLowerCase() === ZERO_ADDRESS
  )
    return { name, avatar: null };

  const record = await input.publicClient
    .readContract({
      address: nameResolver as `0x${string}`,
      abi: TEXT_RESOLVER_ABI,
      functionName: "text",
      args: [node, "avatar"],
    })
    .then((v) => (typeof v === "string" ? v.trim() : ""))
    .catch(() => "");

  if (!record.length) return { name, avatar: null };

  const avatar = await parseAvatarRecord(input.publicClient, { record }).catch(
    () => record,
  );

  return { name, avatar };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addressRaw = url.searchParams.get("address")?.trim();

  if (!addressRaw) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  if (!isEvmAddress(addressRaw)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const address = toAddressLower(addressRaw);

  const cached = ENS_CACHE.get(address);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value);
  }

  const rpcs = getRpcCandidates();

  for (const rpcUrl of rpcs) {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl),
    });

    try {
      const value = await resolveEnsWithClient({ publicClient, address });
      ENS_CACHE.set(address, {
        value,
        expiresAt:
          Date.now() + (value.name ? CACHE_TTL_OK_MS : CACHE_TTL_FAIL_MS),
      });
      return NextResponse.json(value);
    } catch {}
  }

  const value = { name: null, avatar: null } satisfies EnsResult;
  ENS_CACHE.set(address, { value, expiresAt: Date.now() + CACHE_TTL_FAIL_MS });
  return NextResponse.json(value, { status: 200 });
}
