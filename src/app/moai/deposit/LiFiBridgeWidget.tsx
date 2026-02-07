"use client";

import type { WidgetConfig } from "@lifi/widget";
import { ChainType, LiFiWidget, WidgetSkeleton } from "@lifi/widget";
import { useMemo } from "react";
import { ClientOnly } from "@/components/ClientOnly";

function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

const DEFAULT_TO_CHAIN = 8453;
const ALLOWED_CHAINS = [1, 10, 137, 8453, 42161] as const;

const USDC_TOKENS = [
  // Ethereum
  { chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  // Optimism
  { chainId: 10, address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" },
  // Polygon
  { chainId: 137, address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" },
  // Base
  { chainId: 8453, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  // Arbitrum One
  { chainId: 42161, address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
] as const;

const DEFAULT_TO_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export function LiFiBridgeWidget({
  defaultAmountUSDC,
  defaultToAddress,
}: {
  defaultAmountUSDC?: number;
  defaultToAddress?: string;
}) {
  const config = useMemo(() => {
    const amount =
      typeof defaultAmountUSDC === "number" &&
      Number.isFinite(defaultAmountUSDC) &&
      defaultAmountUSDC > 0
        ? defaultAmountUSDC
        : undefined;

    const toAddressRaw = defaultToAddress?.trim();
    const toAddress =
      toAddressRaw && isEvmAddress(toAddressRaw) ? toAddressRaw : undefined;

    return {
      appearance: "light",
      variant: "wide",
      subvariant: "split",
      subvariantOptions: {
        split: "bridge",
      },
      buildUrl: true,
      chains: {
        allow: [...ALLOWED_CHAINS],
      },
      tokens: {
        allow: [...USDC_TOKENS],
      },
      toChain: DEFAULT_TO_CHAIN,
      toToken: DEFAULT_TO_TOKEN,
      fromAmount: amount,
      toAddress: toAddress
        ? {
            address: toAddress,
            chainType: ChainType.EVM,
          }
        : undefined,
      theme: {
        container: {
          border: "1px solid rgb(229, 229, 229)",
          borderRadius: "16px",
        },
      },
    } satisfies Partial<WidgetConfig>;
  }, [defaultAmountUSDC, defaultToAddress]);

  return (
    <ClientOnly fallback={<WidgetSkeleton config={config} />}>
      <LiFiWidget integrator="moai-ethglobal-2026" config={config} />
    </ClientOnly>
  );
}
