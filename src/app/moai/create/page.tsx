import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";

export default function CreateMoaiPage() {
  return (
    <PublicPage>
      <h1 className="mt-10 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Create a Moai
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Create a small group, invite 5–10 people, and set up monthly
        contributions and meetings.
      </p>

      <form className="mt-10 space-y-6">
        <div>
          <label
            className="text-sm font-medium text-neutral-900"
            htmlFor="moaiName"
          >
            Moai name
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            id="moaiName"
            name="moaiName"
            placeholder="e.g. Sunny Circle"
            type="text"
          />
        </div>

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
            placeholder="e.g. Kun"
            type="text"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-neutral-900"
            htmlFor="email"
          >
            Email
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
            This is UI-only for now. Next step: generate an invite link.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-50"
            type="button"
            disabled
          >
            Create Moai
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
