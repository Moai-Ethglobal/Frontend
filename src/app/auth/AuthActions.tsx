"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createSession,
  createSessionWithId,
  readSession,
  writeSession,
} from "@/lib/session";
import { requestWalletAccounts } from "@/lib/wallet";

export function AuthActions() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSignedIn(Boolean(readSession()));
  }, []);

  const onLogin = async (method: "passkey" | "email" | "wallet") => {
    setError(null);
    if (method === "wallet") {
      const accounts = await requestWalletAccounts();
      const address = accounts?.[0];
      if (!address) {
        setError(
          "No wallet detected. Install a wallet extension, or open this page in your wallet app.",
        );
        return;
      }
      createSessionWithId("wallet", address.trim().toLowerCase());
      setSignedIn(true);
      router.push("/moai");
      return;
    }

    createSession(method);
    setSignedIn(true);
    router.push("/moai");
  };

  const onLogout = () => {
    writeSession(null);
    setSignedIn(false);
  };

  if (signedIn === null) {
    return (
      <div className="mt-10 grid gap-3 sm:max-w-sm">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-50"
          type="button"
          disabled
        >
          Loading…
        </button>
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4 sm:max-w-sm">
        <p className="text-sm text-neutral-700">
          You&apos;re signed in on this browser.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            type="button"
            onClick={() => router.push("/moai")}
          >
            Go to My Moai
          </button>
          <button
            className="text-sm font-medium text-neutral-900 hover:underline"
            type="button"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-3 sm:max-w-sm">
      <button
        className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        type="button"
        onClick={() => void onLogin("passkey")}
      >
        Continue with passkey
      </button>
      <button
        className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        type="button"
        onClick={() => void onLogin("email")}
      >
        Continue with email
      </button>
      <button
        className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        type="button"
        onClick={() => void onLogin("wallet")}
      >
        Connect wallet
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
