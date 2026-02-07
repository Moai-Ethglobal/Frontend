import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";

export default function RequestsPage() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Requests
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Emergency withdrawals, contribution changes, and other approvals.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          href="/moai/requests/new"
        >
          Create request
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          href="/moai"
        >
          Back to My Moai
        </Link>
      </div>

      <div className="mt-12 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">No requests yet.</p>
      </div>
    </PublicPage>
  );
}
