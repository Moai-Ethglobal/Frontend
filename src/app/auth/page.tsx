import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";
import { AuthActions } from "./AuthActions";

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

      <AuthActions />

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
