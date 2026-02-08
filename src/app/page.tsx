import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";

export default function Page() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        A small group that meets monthly and has your back.
      </h1>
      <p className="mt-4 text-pretty text-lg leading-8 text-neutral-800">
        Moai is a 5-10 person mutual-aid circle: contribute monthly, meet
        online, vote on emergencies, and have each other&apos;s back.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          aria-label="Create a new Moai group"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-neutral-900 px-6 py-3 text-base font-semibold text-white hover:bg-neutral-800"
          href="/moai/create"
        >
          Create Moai
        </Link>
        <Link
          aria-label="Learn what a Moai is"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-neutral-200 px-6 py-3 text-base font-medium text-neutral-900 hover:bg-neutral-50"
          href="/learn"
        >
          Learn
        </Link>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="text-base font-semibold">Easy sign-in</h2>
          <p className="mt-2 text-base leading-7 text-neutral-700">
            Sign in with a fingerprint, email, or wallet. No complicated setup.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="text-base font-semibold">Monthly meetings</h2>
          <p className="mt-2 text-base leading-7 text-neutral-700">
            Video calls keep everyone connected and build lasting trust.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="text-base font-semibold">Emergency safety net</h2>
          <p className="mt-2 text-base leading-7 text-neutral-700">
            When someone needs help, the group votes and funds are released.
          </p>
        </div>
      </div>
    </PublicPage>
  );
}
