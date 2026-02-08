import { readOnchainMoaiConfig } from "./onchainConfig";
import { readJson, writeJson } from "./storage";

const STORAGE_KEY = "moai.aa.v1";

export type AaConfig = {
  chainId: number;
  rpcUrl: string;
  pimlicoUrl: string;
};

function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0)
    return Math.trunc(value);
  if (typeof value === "string") {
    const n = Number(value.trim());
    if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  }
  return null;
}

function normalize(value: unknown): AaConfig | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<AaConfig>;

  const chainId = parseChainId(v.chainId);
  const rpcUrl = typeof v.rpcUrl === "string" ? v.rpcUrl.trim() : "";
  const pimlicoUrl =
    typeof v.pimlicoUrl === "string" ? v.pimlicoUrl.trim() : "";

  if (!chainId) return null;
  if (!rpcUrl.startsWith("http")) return null;
  if (!pimlicoUrl.startsWith("http")) return null;

  return { chainId, rpcUrl, pimlicoUrl };
}

function buildPimlicoUrlFromEnv(): string {
  const direct = process.env.NEXT_PUBLIC_PIMLICO_RPC_URL?.trim() ?? "";
  if (direct.startsWith("http")) return direct;

  const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY?.trim() ?? "";
  const chain = process.env.NEXT_PUBLIC_PIMLICO_CHAIN?.trim() ?? "";
  if (!apiKey.length || !chain.length) return "";
  return `https://api.pimlico.io/v2/${chain}/rpc?apikey=${apiKey}`;
}

export function readAaConfig(): AaConfig | null {
  const stored = readJson<unknown>(STORAGE_KEY);
  const normalized = normalize(stored);
  if (normalized) return normalized;

  const onchain = readOnchainMoaiConfig();
  const envChainId =
    parseChainId(process.env.NEXT_PUBLIC_MOAI_CHAIN_ID ?? "") ??
    parseChainId(process.env.NEXT_PUBLIC_AA_CHAIN_ID ?? "");

  const chainId = onchain?.chainId ?? envChainId ?? null;
  const rpcUrl =
    process.env.NEXT_PUBLIC_AA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_MOAI_RPC_URL?.trim() ||
    "";
  const pimlicoUrl = buildPimlicoUrlFromEnv();

  return normalize({ chainId, rpcUrl, pimlicoUrl });
}

export function writeAaConfig(value: AaConfig | null): void {
  if (value === null) {
    writeJson(STORAGE_KEY, null);
    return;
  }
  writeJson(STORAGE_KEY, normalize(value));
}
