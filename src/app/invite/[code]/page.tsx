import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Join Moai
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Invite code:{" "}
        <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-sm">
          {code}
        </span>
      </p>

      <form className="mt-10 space-y-6">
        <div>
          <label
            className="text-sm font-medium text-neutral-900"
            htmlFor="displayName"
          >
            Your name
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            id="displayName"
            name="displayName"
            placeholder="e.g. Hema"
            type="text"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-neutral-900"
            htmlFor="email"
          >
            Email (optional)
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            id="email"
            name="email"
            placeholder="you@example.com"
            type="email"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-600">
            Join flow will be wired next.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-50"
            type="button"
            disabled
          >
            Join
          </button>
        </div>
      </form>

      <div className="mt-12 border-t border-neutral-200 pt-6">
        <Link
          className="text-sm font-medium text-neutral-900 hover:underline"
          href="/"
        >
          Back to home
        </Link>
      </div>
    </PublicPage>
  );
}
