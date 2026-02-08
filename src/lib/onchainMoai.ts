import type { Address } from "viem";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
} from "viem";
import { MOAI_ABI } from "@/contracts/abi";
import { isEvmAddress } from "./evm";
import { readOnchainMoaiConfig } from "./onchainConfig";
import { getWalletProvider } from "./wallet";

const USDC_DECIMALS = 6;

export type OnchainMoaiState = {
  moaiAddress: Address;
  chainId: number | null;
  account: Address;
  isMember: boolean;
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
    distributionPotUSDC: formatUSDC(distributionPot),
    emergencyReserveUSDC: formatUSDC(emergencyReserve),
    withdrawableUSDC: formatUSDC(withdrawAmount),
    withdrawReason,
    withdrawRefId,
  };
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
