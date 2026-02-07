"use client";

import type { WidgetConfig } from "@lifi/widget";
import { LiFiWidget, WidgetSkeleton } from "@lifi/widget";
import { useMemo } from "react";
import { ClientOnly } from "@/components/ClientOnly";

export function LiFiBridgeWidget() {
  const config = useMemo(() => {
    return {
      appearance: "light",
      variant: "wide",
      subvariant: "split",
      subvariantOptions: {
        split: "bridge",
      },
      theme: {
        container: {
          border: "1px solid rgb(229, 229, 229)",
          borderRadius: "16px",
        },
      },
    } satisfies Partial<WidgetConfig>;
  }, []);

  return (
    <ClientOnly fallback={<WidgetSkeleton config={config} />}>
      <LiFiWidget integrator="moai-ethglobal-2026" config={config} />
    </ClientOnly>
  );
}
