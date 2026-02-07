import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-white text-neutral-950">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <SiteHeader />
        {children}
      </div>
    </main>
  );
}
