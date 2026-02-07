import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";
import { MeetingsClient } from "./MeetingsClient";

export default function MeetingsPage() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Meetings
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Monthly check-in keeps membership active.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          href="/moai"
        >
          Back to My Moai
        </Link>
      </div>

      <MeetingsClient />
    </PublicPage>
  );
}
