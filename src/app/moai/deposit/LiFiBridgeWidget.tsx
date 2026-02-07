"use client";

import type { WidgetConfig } from "@lifi/widget";
import { ChainType, LiFiWidget, WidgetSkeleton } from "@lifi/widget";
import { useMemo } from "react";
import { ClientOnly } from "@/components/ClientOnly";

function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

const DEFAULT_TO_CHAIN = 8453;

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
      toChain: DEFAULT_TO_CHAIN,
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
