import type { Address } from "viem";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  parseEventLogs,
  parseUnits,
} from "viem";
import { MOAI_ABI } from "@/contracts/abi";
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

export type OnchainMoaiState = {
  moaiAddress: Address;
  chainId: number | null;
  account: Address;
  isMember: boolean;
  contributionAmountUSDC: string;
  currentMonth: bigint;
  paidThisMonth: boolean;
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

function getAccountFromSessionId(sessionId: string | null): Address | null {
  const id = sessionId?.trim() ?? "";
  if (!isEvmAddress(id)) return null;
  return id as Address;
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

  const provider = getWalletProvider();
  if (!provider) return null;

  const account = getAccountFromSessionId(input.sessionId);
  if (!account) return null;

  const moaiAddress = cfg.moaiAddress as Address;

  const publicClient = createPublicClient({
    transport: custom(provider),
  });

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

  const provider = getWalletProvider();
  if (!provider) return { ok: false, error: "Wallet provider not available." };

  const account = getAccountFromSessionId(input.sessionId);
  if (!account) return { ok: false, error: "Login with a wallet account." };

  const moaiAddress = cfg.moaiAddress as Address;

  const publicClient = createPublicClient({ transport: custom(provider) });
  const walletClient = createWalletClient({ transport: custom(provider) });

  try {
    const { request } = await publicClient.simulateContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "joinMoai",
      args: [],
      account,
    });
    const hash = await walletClient.writeContract(request);
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

  const provider = getWalletProvider();
  if (!provider) return { ok: false, error: "Wallet provider not available." };

  const account = getAccountFromSessionId(input.sessionId);
  if (!account) return { ok: false, error: "Login with a wallet account." };

  const moaiAddress = cfg.moaiAddress as Address;

  const publicClient = createPublicClient({ transport: custom(provider) });
  const walletClient = createWalletClient({ transport: custom(provider) });

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
  if (amount <= 0n) return { ok: false, error: "Invalid contribution amount." };

  const allowance = await publicClient
    .readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account, moaiAddress],
    })
    .then(asBigInt)
    .catch(() => 0n);

  const hashes: `0x${string}`[] = [];

  try {
    if (allowance < amount) {
      const { request: approveReq } = await publicClient.simulateContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [moaiAddress, amount],
        account,
      });
      hashes.push(await walletClient.writeContract(approveReq));
    }

    const { request: contributeReq } = await publicClient.simulateContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "contribute",
      args: [],
      account,
    });
    hashes.push(await walletClient.writeContract(contributeReq));
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

  const provider = getWalletProvider();
  if (!provider) return { ok: false, error: "Wallet provider not available." };

  const account = getAccountFromSessionId(input.sessionId);
  if (!account) return { ok: false, error: "Login with a wallet account." };

  const moaiAddress = cfg.moaiAddress as Address;

  const publicClient = createPublicClient({ transport: custom(provider) });
  const walletClient = createWalletClient({ transport: custom(provider) });

  try {
    const { request } = await publicClient.simulateContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "distributeMonth",
      args: [],
      account,
    });
    const hash = await walletClient.writeContract(request);
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

  const provider = getWalletProvider();
  if (!provider) return null;

  const moaiAddress = cfg.moaiAddress as Address;
  const publicClient = createPublicClient({ transport: custom(provider) });

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

  const provider = getWalletProvider();
  if (!provider) return { ok: false, error: "Wallet provider not available." };

  const account = getAccountFromSessionId(input.sessionId);
  if (!account) return { ok: false, error: "Login with a wallet account." };

  const amountUnits = parseUSDCToUnits(input.amountUSDC);
  if (!amountUnits) return { ok: false, error: "Invalid amount." };

  const moaiAddress = cfg.moaiAddress as Address;

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
      account,
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

export async function voteEmergencyOnchain(input: {
  sessionId: string | null;
  requestId: bigint;
  approve: boolean;
}): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; error: string }> {
  const cfg = readOnchainMoaiConfig();
  if (!cfg) return { ok: false, error: "Onchain config not set." };

  const provider = getWalletProvider();
  if (!provider) return { ok: false, error: "Wallet provider not available." };

  const account = getAccountFromSessionId(input.sessionId);
  if (!account) return { ok: false, error: "Login with a wallet account." };

  const moaiAddress = cfg.moaiAddress as Address;

  const publicClient = createPublicClient({ transport: custom(provider) });
  const walletClient = createWalletClient({ transport: custom(provider) });

  try {
    const { request } = await publicClient.simulateContract({
      address: moaiAddress,
      abi: MOAI_ABI,
      functionName: "voteEmergency",
      args: [input.requestId, input.approve],
      account,
    });
    const hash = await walletClient.writeContract(request);
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

  const provider = getWalletProvider();
  if (!provider) return { ok: false, error: "Wallet provider not available." };

  const account = getAccountFromSessionId(input.sessionId);
  if (!account) return { ok: false, error: "Login with a wallet account." };

  const moaiAddress = cfg.moaiAddress as Address;

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
      args: [account],
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
        account,
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
        account,
      });
      const hash = await walletClient.writeContract(request);
      return { ok: true, hash };
    }

    return { ok: false, error: "No withdrawable balance." };
  } catch {
    return { ok: false, error: "Transaction failed." };
  }
}
