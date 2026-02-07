import Link from "next/link";
import { Suspense } from "react";
import { PublicPage } from "@/components/PublicPage";
import { RequestDetailClient } from "./RequestDetailClient";

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Request
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Details and approvals.
      </p>

      <Suspense
        fallback={<p className="mt-10 text-sm text-neutral-600">Loading…</p>}
      >
        {params.then(({ id }) => (
          <RequestDetailClient requestId={id} />
        ))}
      </Suspense>

      <div className="mt-12 border-t border-neutral-200 pt-6">
        <Link
          className="text-sm font-medium text-neutral-900 hover:underline"
          href="/moai/requests"
        >
          Back to requests
        </Link>
      </div>
    </PublicPage>
  );
}
