import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";

export default function Page() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        A small group that meets monthly and has your back.
      </h1>
      <p className="mt-4 text-pretty text-base leading-7 text-neutral-800">
        Moai is a 5–10 person mutual-aid circle: contribute USDC monthly, meet
        on Huddle, vote on emergencies, and keep funds in a low-risk, liquid
        strategy.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          href="/moai/create"
        >
          Create Moai
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          href="/learn"
        >
          Learn
        </Link>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold">Web2-grade onboarding</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-700">
            Passkeys / email with account abstraction. No seed phrases.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold">Meetings keep trust real</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-700">
            Monthly Huddle meetings build relationships and reduce free-riding.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold">Emergency-first safety net</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-700">
            51% approval for emergency withdrawals. Clear, human rules.
          </p>
        </div>
      </div>
    </PublicPage>
  );
}
