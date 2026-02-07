import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";

export default function AuthPage() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Login
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Sign in with passkeys or email. Wallet connect is available as a
        fallback.
      </p>

      <div className="mt-10 grid gap-3 sm:max-w-sm">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-50"
          type="button"
          disabled
        >
          Continue with passkey
        </button>
        <button
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 opacity-50"
          type="button"
          disabled
        >
          Continue with email
        </button>
        <button
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 opacity-50"
          type="button"
          disabled
        >
          Connect wallet
        </button>
      </div>

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
