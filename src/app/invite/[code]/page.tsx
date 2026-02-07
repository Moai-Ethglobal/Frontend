import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";
import { JoinMoaiForm } from "./JoinMoaiForm";

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
      <JoinMoaiForm inviteCode={code} />

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
