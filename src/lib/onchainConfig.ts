import { isEvmAddress } from "./evm";
import { readJson, writeJson } from "./storage";

const STORAGE_KEY = "moai.onchain.v1";

export type OnchainMoaiConfig = {
  moaiAddress: string;
  chainId?: number;
};

function parseChainId(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value <= 0) return undefined;
  return Math.trunc(value);
}

function normalizeConfig(value: unknown): OnchainMoaiConfig | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<OnchainMoaiConfig>;

  const moaiAddress =
    typeof v.moaiAddress === "string" ? v.moaiAddress.trim() : "";
  if (!isEvmAddress(moaiAddress)) return null;

  const chainId = parseChainId(v.chainId);

  return { moaiAddress, chainId };
}

export function readOnchainMoaiConfig(): OnchainMoaiConfig | null {
  const stored = readJson<unknown>(STORAGE_KEY);
  const normalized = normalizeConfig(stored);
  if (normalized) return normalized;

  const envAddress =
    process.env.NEXT_PUBLIC_MOAI_CONTRACT_ADDRESS?.trim() ?? "";
  const envChainIdRaw = process.env.NEXT_PUBLIC_MOAI_CHAIN_ID?.trim() ?? "";
  const envChainId = envChainIdRaw ? Number(envChainIdRaw) : undefined;

  const fromEnv = normalizeConfig({
    moaiAddress: envAddress,
    chainId: envChainId,
  });
  return fromEnv;
}

export function writeOnchainMoaiConfig(value: OnchainMoaiConfig | null): void {
  if (value === null) {
    writeJson(STORAGE_KEY, null);
    return;
  }
  const normalized = normalizeConfig(value);
  writeJson(STORAGE_KEY, normalized);
}
