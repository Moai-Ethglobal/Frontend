import type { Address } from "viem";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  getContract,
  parseEventLogs,
  parseUnits,
} from "viem";
import { eip5792Actions } from "viem/experimental";
import { MOAI_ABI } from "@/contracts/abi";
import { getAaClients } from "./aa";
import { isEvmAddress } from "./evm";
import { readOnchainMoaiConfig } from "./onchainConfig";
import { getWalletProvider } from "./wallet";

const USDC_DECIMALS = 6;

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const EMERGENCY_REQUESTED_EVENT_ABI = [
  {
    type: "event",
    name: "EmergencyRequested",
    anonymous: false,
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "beneficiary", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;

const REMOVAL_PROPOSED_EVENT_ABI = [
  {
    type: "event",
    name: "RemovalProposed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "member", type: "address" },
    ],
  },
] as const;

export type OnchainMoaiState = {
  moaiAddress: Address;
  chainId: number | null;
  account: Address;
  isMember: boolean;
  contributionAmountUSDC: string;
  currentMonth: bigint;
  paidThisMonth: boolean;
  outstandingUSDC: string;
  isDissolved: boolean;
  dissolutionVotes: bigint;
  distributionPotUSDC: string;
  emergencyReserveUSDC: string;
  withdrawableUSDC: string;
  withdrawReason: "none" | "round_robin" | "emergency";
  withdrawRefId: bigint;
};

function formatUSDC(units: bigint): string {
  const raw = formatUnits(units, USDC_DECIMALS);
  const [i, f = ""] = raw.split(".");
  if (!f.length) return i;
  return `${i}.${f.slice(0, 2).padEnd(2, "0")}`;
}

function asBigInt(value: unknown): bigint {
  return typeof value === "bigint" ? value : 0n;
}

function asUintNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  return 0;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asTxHash(value: unknown): `0x${string}` | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v.startsWith("0x")) return null;
  if (v.length < 10) return null;
  return v as `0x${string}`;
}

function parseUSDCToUnits(value: string): bigint | null {
  const v = value.trim();
  if (!v.length) return null;
  try {
    const u = parseUnits(v, USDC_DECIMALS);
    return u > 0n ? u : null;
  } catch {
    return null;
  }
}

type ResolvedExecution =
  | { kind: "wallet"; account: Address }
  | { kind: "aa"; account: Address; identityId: string };

async function resolveExecution(
  sessionId: string | null,
): Promise<ResolvedExecution | null> {
  const id = sessionId?.trim() ?? "";
  if (!id.length) return null;
  if (isEvmAddress(id)) return { kind: "wallet", account: id as Address };

  const aa = await getAaClients({ identityId: id });
  if (!aa) return null;
  return { kind: "aa", account: aa.smartAccountAddress, identityId: id };
}

export function getOnchainMoaiAddress(): Address | null {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return null;
  if (!isEvmAddress(cfg.moaiAddress)) return null;
  return cfg.moaiAddress as Address;
}

export async function readOnchainMoaiState(input: {
  sessionId: string | null;
}): Promise<OnchainMoaiState | null> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return null;

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return null;
  const account = resolved.account;

  const moaiAddress = cfg.moaiAddress as Address;

  const publicClient =
    resolved.kind === "wallet"
      ? (() => {
          const provider = getWalletProvider();
          if (!provider) return null;
          return createPublicClient({ transport: custom(provider) });
        })()
      : ((await getAaClients({ identityId: resolved.identityId }))
          ?.publicClient ?? null);
  if (!publicClient) return null;

  const chainId = await publicClient.getChainId().catch(() => null);
  const member = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "isMember",
      args: [account],
    })
    .then((v) => Boolean(v))
    .catch(() => false);

  const contributionAmount = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "contributionAmount",
      args: [],
    })
    .then(asBigInt)
    .catch(() => 0n);

  const currentMonth = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "currentMonth",
      args: [],
    })
    .then(asBigInt)
    .catch(() => 0n);

  const paidThisMonth = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "paidThisMonth",
      args: [account],
    })
    .then(asBoolean)
    .catch(() => false);

  const outstanding = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "outstandingAmount",
      args: [account],
    })
    .then(asBigInt)
    .catch(() => 0n);

  const isDissolved = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "isDissolved",
      args: [],
    })
    .then(asBoolean)
    .catch(() => false);

  const dissolutionVotes = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "dissolutionVotes",
      args: [],
    })
    .then(asBigInt)
    .catch(() => 0n);

  const reserve = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "getReserveBalances",
      args: [],
    })
    .then((v) => (Array.isArray(v) ? v : []))
    .catch(() => []);

  const withdrawable = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "getWithdrawable",
      args: [account],
    })
    .then((v) => (Array.isArray(v) ? v : []))
    .catch(() => []);

  const distributionPot = asBigInt(reserve[0]);
  const emergencyReserve = asBigInt(reserve[1]);

  const withdrawAmount = asBigInt(withdrawable[0]);
  const withdrawReasonCode = asUintNumber(withdrawable[1]);
  const withdrawRefId = asBigInt(withdrawable[2]);

  const withdrawReason: OnchainMoaiState["withdrawReason"] =
    withdrawReasonCode === 1
      ? "round_robin"
      : withdrawReasonCode === 2
        ? "emergency"
        : "none";

  return {
    moaiAddress,
    chainId,
    account,
    isMember: member,
    contributionAmountUSDC: formatUSDC(contributionAmount),
    currentMonth,
    paidThisMonth,
    outstandingUSDC: formatUSDC(outstanding),
    isDissolved,
    dissolutionVotes,
    distributionPotUSDC: formatUSDC(distributionPot),
    emergencyReserveUSDC: formatUSDC(emergencyReserve),
    withdrawableUSDC: formatUSDC(withdrawAmount),
    withdrawReason,
    withdrawRefId,
  };
}

export async function joinOnchain(input: {
  sessionId: string | null;
}): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; error: string }> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to join." };
  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });

    try {
      const { request } = await publicClient.simulateContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "joinMoai",
        args: [],
        account: resolved.account,
      });
      const hash = await walletClient.writeContract(request);
      return { ok: true, hash };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });
    const hash = await moai.write.joinMoai();
    return { ok: true, hash };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function contributeOnchain(input: {
  sessionId: string | null;
}): Promise<
  { ok: true; hashes: readonly `0x${string}`[] } | { ok: false; error: string }
> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to contribute." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({
      transport: custom(provider),
    }).extend(eip5792Actions());

    const token = await publicClient
      .readContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "USDC",
        args: [],
      })
      .then((v) => (typeof v === "string" ? v : ""))
      .catch(() => "");
    if (!isEvmAddress(token))
      return { ok: false, error: "Invalid USDC address." };
    const usdcAddress = token as Address;

    const amount = await publicClient
      .readContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "contributionAmount",
        args: [],
      })
      .then(asBigInt)
      .catch(() => 0n);
    if (amount <= 0n)
      return { ok: false, error: "Invalid contribution amount." };

    const allowance = await publicClient
      .readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [resolved.account, moaiAddress],
      })
      .then(asBigInt)
      .catch(() => 0n);

    const calls: {
      to: Address;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
    }[] = [];

    if (allowance < amount) {
      calls.push({
        to: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [moaiAddress, amount],
      });
    }

    calls.push({
      to: moaiAddress,
      abi: MOAI_ABI,
      functionName: "contribute",
      args: [],
    });

    try {
      const { id } = await walletClient.sendCalls({
        account: resolved.account,
        calls,
        experimental_fallback: true,
      });

      const status = await walletClient.waitForCallsStatus({ id });
      if (status.status !== "success") {
        return { ok: false, error: "Transaction failed." };
      }

      const hashes = (status.receipts ?? [])
        .map((r) =>
          r && typeof r === "object"
            ? (r as { transactionHash?: unknown }).transactionHash
            : null,
        )
        .map(asTxHash)
        .filter((x): x is `0x${string}` => Boolean(x));

      return { ok: true, hashes };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  const token = await aa.publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "USDC",
      args: [],
    })
    .then((v) => (typeof v === "string" ? v : ""))
    .catch(() => "");
  if (!isEvmAddress(token))
    return { ok: false, error: "Invalid USDC address." };
  const usdcAddress = token as Address;

  const amount = await aa.publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "contributionAmount",
      args: [],
    })
    .then(asBigInt)
    .catch(() => 0n);
  if (amount <= 0n) return { ok: false, error: "Invalid contribution amount." };

  const allowance = await aa.publicClient
    .readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [aa.smartAccountAddress, moaiAddress],
    })
    .then(asBigInt)
    .catch(() => 0n);

  const hashes: `0x${string}`[] = [];

  try {
    const usdc = getContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });

    if (allowance < amount) {
      hashes.push(
        await usdc.write.approve([moaiAddress, amount], {
          account: aa.smartAccountAddress,
          chain: aa.publicClient.chain,
        }),
      );
    }

    hashes.push(await moai.write.contribute());
    return { ok: true, hashes };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function distributeMonthOnchain(input: {
  sessionId: string | null;
}): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; error: string }> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to distribute." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });

    try {
      const { request } = await publicClient.simulateContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "distributeMonth",
        args: [],
        account: resolved.account,
      });
      const hash = await walletClient.writeContract(request);
      return { ok: true, hash };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });
    const hash = await moai.write.distributeMonth();
    return { ok: true, hash };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export type OnchainEmergencyRequest = {
  requestId: bigint;
  beneficiary: Address;
  amountUSDC: string;
  approvalCount: bigint;
  approved: boolean;
};

export async function readEmergencyRequestOnchain(input: {
  sessionId: string | null;
  requestId: bigint;
}): Promise<OnchainEmergencyRequest | null> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return null;

  const moaiAddress = cfg.moaiAddress as Address;
  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return null;

  const publicClient =
    resolved.kind === "wallet"
      ? (() => {
          const provider = getWalletProvider();
          if (!provider) return null;
          return createPublicClient({ transport: custom(provider) });
        })()
      : ((await getAaClients({ identityId: resolved.identityId }))
          ?.publicClient ?? null);
  if (!publicClient) return null;

  const value = await publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "getEmergencyRequest",
      args: [input.requestId],
    })
    .then((v) => (Array.isArray(v) ? v : []))
    .catch(() => []);

  const beneficiaryRaw = value[0];
  const amount = asBigInt(value[1]);
  const approvalCount = asBigInt(value[2]);
  const approved = asBoolean(value[3]);

  if (typeof beneficiaryRaw !== "string" || !isEvmAddress(beneficiaryRaw)) {
    return null;
  }

  return {
    requestId: input.requestId,
    beneficiary: beneficiaryRaw as Address,
    amountUSDC: formatUSDC(amount),
    approvalCount,
    approved,
  };
}

export async function requestEmergencyOnchain(input: {
  sessionId: string | null;
  amountUSDC: string;
}): Promise<
  | { ok: true; hash: `0x${string}`; requestId: bigint }
  | { ok: false; error: string }
> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to request emergency." };

  const amountUnits = parseUSDCToUnits(input.amountUSDC);
  if (!amountUnits) return { ok: false, error: "Invalid amount." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });

    const before = await publicClient
      .readContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "emergencyRequestCount",
        args: [],
      })
      .then(asBigInt)
      .catch(() => 0n);

    try {
      const { request } = await publicClient.simulateContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "requestEmergency",
        args: [amountUnits],
        account: resolved.account,
      });

      const hash = await walletClient.writeContract(request);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      let requestId = before;
      try {
        const parsed = parseEventLogs({
          abi: EMERGENCY_REQUESTED_EVENT_ABI,
          logs: receipt.logs,
          eventName: "EmergencyRequested",
        });
        if (parsed.length > 0) requestId = parsed[0].args.requestId;
      } catch {
        // ignore
      }

      return { ok: true, hash, requestId };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  const before = await aa.publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "emergencyRequestCount",
      args: [],
    })
    .then(asBigInt)
    .catch(() => 0n);

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });

    const hash = await moai.write.requestEmergency([amountUnits]);
    const receipt = await aa.publicClient.waitForTransactionReceipt({ hash });

    let requestId = before;
    try {
      const parsed = parseEventLogs({
        abi: EMERGENCY_REQUESTED_EVENT_ABI,
        logs: receipt.logs,
        eventName: "EmergencyRequested",
      });
      if (parsed.length > 0) requestId = parsed[0].args.requestId;
    } catch {
      // ignore
    }

    return { ok: true, hash, requestId };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function voteEmergencyOnchain(input: {
  sessionId: string | null;
  requestId: bigint;
  approve: boolean;
}): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; error: string }> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to vote." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });

    try {
      const { request } = await publicClient.simulateContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "voteEmergency",
        args: [input.requestId, input.approve],
        account: resolved.account,
      });
      const hash = await walletClient.writeContract(request);
      return { ok: true, hash };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });
    const hash = await moai.write.voteEmergency([
      input.requestId,
      input.approve,
    ]);
    return { ok: true, hash };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function withdrawOnchain(input: {
  sessionId: string | null;
}): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; error: string }> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to withdraw." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({
      transport: custom(provider),
    });

    const walletClient = createWalletClient({
      transport: custom(provider),
    });

    const withdrawable = await publicClient
      .readContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "getWithdrawable",
        args: [resolved.account],
      })
      .then((v) => (Array.isArray(v) ? v : []))
      .catch(() => []);

    const amount = asBigInt(withdrawable[0]);
    const reason = asUintNumber(withdrawable[1]);
    const refId = asBigInt(withdrawable[2]);

    if (amount <= 0n) return { ok: false, error: "Nothing to withdraw." };

    try {
      if (reason === 2) {
        const { request } = await publicClient.simulateContract({
          address: moaiAddress,
          abi: MOAI_ABI,
          functionName: "withdrawEmergency",
          args: [],
          account: resolved.account,
        });
        const hash = await walletClient.writeContract(request);
        return { ok: true, hash };
      }

      if (reason === 1) {
        const { request } = await publicClient.simulateContract({
          address: moaiAddress,
          abi: MOAI_ABI,
          functionName: "withdrawRoundRobin",
          args: [refId],
          account: resolved.account,
        });
        const hash = await walletClient.writeContract(request);
        return { ok: true, hash };
      }

      return { ok: false, error: "No withdrawable balance." };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  const withdrawable = await aa.publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "getWithdrawable",
      args: [aa.smartAccountAddress],
    })
    .then((v) => (Array.isArray(v) ? v : []))
    .catch(() => []);

  const amount = asBigInt(withdrawable[0]);
  const reason = asUintNumber(withdrawable[1]);
  const refId = asBigInt(withdrawable[2]);

  if (amount <= 0n) return { ok: false, error: "Nothing to withdraw." };

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });

    if (reason === 2) {
      const hash = await moai.write.withdrawEmergency();
      return { ok: true, hash };
    }

    if (reason === 1) {
      const hash = await moai.write.withdrawRoundRobin([refId]);
      return { ok: true, hash };
    }

    return { ok: false, error: "No withdrawable balance." };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function payOutstandingOnchain(input: {
  sessionId: string | null;
  amountUSDC: string;
}): Promise<
  { ok: true; hashes: readonly `0x${string}`[] } | { ok: false; error: string }
> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to pay outstanding." };

  const amountLabel = input.amountUSDC.trim().toLowerCase();
  const useAll = amountLabel === "all" || amountLabel === "max";
  const amountUnits = useAll ? null : parseUSDCToUnits(input.amountUSDC);
  if (!useAll && !amountUnits) return { ok: false, error: "Invalid amount." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({
      transport: custom(provider),
    }).extend(eip5792Actions());

    const token = await publicClient
      .readContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "USDC",
        args: [],
      })
      .then((v) => (typeof v === "string" ? v : ""))
      .catch(() => "");
    if (!isEvmAddress(token))
      return { ok: false, error: "Invalid USDC address." };
    const usdcAddress = token as Address;

    const outstanding = await publicClient
      .readContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "outstandingAmount",
        args: [resolved.account],
      })
      .then(asBigInt)
      .catch(() => 0n);
    if (outstanding <= 0n) return { ok: false, error: "Nothing outstanding." };
    const amountToPay = useAll ? outstanding : (amountUnits ?? 0n);
    if (amountToPay <= 0n) return { ok: false, error: "Invalid amount." };
    if (amountToPay > outstanding)
      return { ok: false, error: "Amount exceeds outstanding." };

    const allowance = await publicClient
      .readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [resolved.account, moaiAddress],
      })
      .then(asBigInt)
      .catch(() => 0n);

    const calls: {
      to: Address;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
    }[] = [];

    if (allowance < amountToPay) {
      calls.push({
        to: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [moaiAddress, amountToPay],
      });
    }

    calls.push({
      to: moaiAddress,
      abi: MOAI_ABI,
      functionName: "payOutstanding",
      args: [amountToPay],
    });

    try {
      const { id } = await walletClient.sendCalls({
        account: resolved.account,
        calls,
        experimental_fallback: true,
      });

      const status = await walletClient.waitForCallsStatus({ id });
      if (status.status !== "success") {
        return { ok: false, error: "Transaction failed." };
      }

      const hashes = (status.receipts ?? [])
        .map((r) =>
          r && typeof r === "object"
            ? (r as { transactionHash?: unknown }).transactionHash
            : null,
        )
        .map(asTxHash)
        .filter((x): x is `0x${string}` => Boolean(x));

      return { ok: true, hashes };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  const token = await aa.publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "USDC",
      args: [],
    })
    .then((v) => (typeof v === "string" ? v : ""))
    .catch(() => "");
  if (!isEvmAddress(token))
    return { ok: false, error: "Invalid USDC address." };
  const usdcAddress = token as Address;

  const outstanding = await aa.publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "outstandingAmount",
      args: [aa.smartAccountAddress],
    })
    .then(asBigInt)
    .catch(() => 0n);
  if (outstanding <= 0n) return { ok: false, error: "Nothing outstanding." };
  const amountToPay = useAll ? outstanding : (amountUnits ?? 0n);
  if (amountToPay <= 0n) return { ok: false, error: "Invalid amount." };
  if (amountToPay > outstanding)
    return { ok: false, error: "Amount exceeds outstanding." };

  const allowance = await aa.publicClient
    .readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [aa.smartAccountAddress, moaiAddress],
    })
    .then(asBigInt)
    .catch(() => 0n);

  const hashes: `0x${string}`[] = [];

  try {
    const usdc = getContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });

    if (allowance < amountToPay) {
      hashes.push(
        await usdc.write.approve([moaiAddress, amountToPay], {
          account: aa.smartAccountAddress,
          chain: aa.publicClient.chain,
        }),
      );
    }

    hashes.push(
      await moai.write.payOutstanding([amountToPay], {
        account: aa.smartAccountAddress,
        chain: aa.publicClient.chain,
      }),
    );
    return { ok: true, hashes };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function proposeRemovalOnchain(input: {
  sessionId: string | null;
  member: string;
}): Promise<
  | { ok: true; hash: `0x${string}`; requestId: bigint }
  | { ok: false; error: string }
> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to propose removal." };

  const member = input.member.trim();
  if (!isEvmAddress(member)) return { ok: false, error: "Invalid member." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });

    const before = await publicClient
      .readContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "removalRequestCount",
        args: [],
      })
      .then(asBigInt)
      .catch(() => 0n);

    try {
      const { request } = await publicClient.simulateContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "proposeRemoval",
        args: [member],
        account: resolved.account,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let requestId = before;
      try {
        const parsed = parseEventLogs({
          abi: REMOVAL_PROPOSED_EVENT_ABI,
          logs: receipt.logs,
          eventName: "RemovalProposed",
        });
        if (parsed.length > 0) requestId = parsed[0].args.requestId;
      } catch {
        // ignore
      }

      if (requestId === before) {
        const after = await publicClient
          .readContract({
            address: moaiAddress,
            abi: MOAI_ABI,
            functionName: "removalRequestCount",
            args: [],
          })
          .then(asBigInt)
          .catch(() => before);
        if (after > before) requestId = after;
      }

      return { ok: true, hash, requestId };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  const before = await aa.publicClient
    .readContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "removalRequestCount",
      args: [],
    })
    .then(asBigInt)
    .catch(() => 0n);

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });

    const hash = await moai.write.proposeRemoval([member], {
      account: aa.smartAccountAddress,
      chain: aa.publicClient.chain,
    });
    const receipt = await aa.publicClient.waitForTransactionReceipt({ hash });

    let requestId = before;
    try {
      const parsed = parseEventLogs({
        abi: REMOVAL_PROPOSED_EVENT_ABI,
        logs: receipt.logs,
        eventName: "RemovalProposed",
      });
      if (parsed.length > 0) requestId = parsed[0].args.requestId;
    } catch {
      // ignore
    }

    if (requestId === before) {
      const after = await aa.publicClient
        .readContract({
          address: moaiAddress,
          abi: MOAI_ABI,
          functionName: "removalRequestCount",
          args: [],
        })
        .then(asBigInt)
        .catch(() => before);
      if (after > before) requestId = after;
    }

    return { ok: true, hash, requestId };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function voteRemovalOnchain(input: {
  sessionId: string | null;
  requestId: bigint;
  approve: boolean;
}): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; error: string }> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to vote." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });

    try {
      const { request } = await publicClient.simulateContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "voteRemoval",
        args: [input.requestId, input.approve],
        account: resolved.account,
      });
      const hash = await walletClient.writeContract(request);
      return { ok: true, hash };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });
    const hash = await moai.write.voteRemoval(
      [input.requestId, input.approve],
      {
        account: aa.smartAccountAddress,
        chain: aa.publicClient.chain,
      },
    );
    return { ok: true, hash };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function voteForDissolutionOnchain(input: {
  sessionId: string | null;
}): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; error: string }> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to vote." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });

    try {
      const { request } = await publicClient.simulateContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "voteForDissolution",
        args: [],
        account: resolved.account,
      });
      const hash = await walletClient.writeContract(request);
      return { ok: true, hash };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });
    const hash = await moai.write.voteForDissolution([], {
      account: aa.smartAccountAddress,
      chain: aa.publicClient.chain,
    });
    return { ok: true, hash };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}

export async function exitMoaiOnchain(input: {
  sessionId: string | null;
}): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; error: string }> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const resolved = await resolveExecution(input.sessionId);
  if (!resolved) return { ok: false, error: "Login to exit." };

  const moaiAddress = cfg.moaiAddress as Address;

  if (resolved.kind === "wallet") {
    const provider = getWalletProvider();
    if (!provider)
      return { ok: false, error: "Wallet provider not available." };

    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });

    try {
      const { request } = await publicClient.simulateContract({
        address: moaiAddress,
        abi: MOAI_ABI,
        functionName: "exitMoai",
        args: [],
        account: resolved.account,
      });
      const hash = await walletClient.writeContract(request);
      return { ok: true, hash };
    } catch {
      return { ok: false, error: "Transaction failed." };
    }
  }

  const aa = await getAaClients({ identityId: resolved.identityId });
  if (!aa) return { ok: false, error: "AA config not set." };

  try {
    const moai = getContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      client: { public: aa.publicClient, wallet: aa.smartAccountClient },
    });
    const hash = await moai.write.exitMoai([], {
      account: aa.smartAccountAddress,
      chain: aa.publicClient.chain,
    });
    return { ok: true, hash };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}
