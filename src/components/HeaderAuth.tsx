"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readSession, writeSession } from "@/lib/session";

export function HeaderAuth() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setSignedIn(Boolean(readSession()));
  }, []);

  const onLogout = () => {
    writeSession(null);
    setSignedIn(false);
  };

  if (signedIn === null) return null;

  if (!signedIn) {
    return (
      <Link className="text-neutral-700 hover:text-neutral-950" href="/auth">
        Login
      </Link>
    );
  }

  return (
    <button
      className="text-neutral-700 hover:text-neutral-950"
      type="button"
      onClick={onLogout}
    >
      Logout
    </button>
  );
}
