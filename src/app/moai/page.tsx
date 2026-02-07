import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";

export default function MyMoaiPage() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        My Moai
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Your dashboard will live here. For now, create a Moai or open an invite
        link to join.
      </p>

      <div className="mt-10 grid gap-3 sm:max-w-sm sm:grid-cols-2">
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

      <div className="mt-12 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Next</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-700">
          <li>Persist created moai + members (mock adapter)</li>
          <li>Wire join flow to add a member</li>
          <li>Show members, outstanding, withdrawable, requests, meetings</li>
        </ul>
      </div>
    </PublicPage>
  );
}
