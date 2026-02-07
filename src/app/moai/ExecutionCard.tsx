"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readSession } from "@/lib/session";
import {
  requestChainId,
  requestWalletCapabilities,
  type WalletCapabilities,
} from "@/lib/wallet";

function atomicSupported(
  capabilities: WalletCapabilities,
  chainId: number | null,
): boolean | null {
  if (!chainId) return null;
  const chainKey = String(chainId);
  const chain = capabilities[chainKey];
  if (!chain || typeof chain !== "object") return null;
  const atomic = (chain as { atomic?: unknown }).atomic;
  if (!atomic || typeof atomic !== "object") return null;
  const status = (atomic as { status?: unknown }).status;
  return status === "supported";
}

function paymasterServiceSupported(
  capabilities: WalletCapabilities,
  chainId: number | null,
): boolean | null {
  if (!chainId) return null;
  const chainKey = String(chainId);
  const chain = capabilities[chainKey];
  if (!chain || typeof chain !== "object") return null;
  const pm = (chain as { paymasterService?: unknown }).paymasterService;
  if (!pm || typeof pm !== "object") return null;
  const supported = (pm as { supported?: unknown }).supported;
  return typeof supported === "boolean" ? supported : null;
}

export function ExecutionCard() {
  const [ready, setReady] = useState(false);
  const [method, setMethod] = useState<"none" | "passkey" | "email" | "wallet">(
    "none",
  );
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [capabilities, setCapabilities] = useState<WalletCapabilities | null>(
    null,
  );
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    setMethod(session?.method ?? "none");
    setAccount(session?.method === "wallet" ? session.id : null);
    setReady(true);
  }, []);

  const onDetect = async () => {
    setError(null);
    setCapabilities(null);
    setStatus("loading");

    if (method !== "wallet" || !account) {
      setStatus("error");
      setError("Connect a wallet to detect capabilities.");
      return;
    }

    const id = await requestChainId();
    setChainId(id);

    const caps = await requestWalletCapabilities({
      account,
      chainId: id ?? undefined,
    });
    if (!caps) {
      setStatus("error");
      setError("wallet_getCapabilities not available on this wallet.");
      return;
    }

    setCapabilities(caps);
    setStatus("loaded");
  };

  const atomic = useMemo(
    () => (capabilities ? atomicSupported(capabilities, chainId) : null),
    [capabilities, chainId],
  );

  const paymaster = useMemo(
    () =>
      capabilities ? paymasterServiceSupported(capabilities, chainId) : null,
    [capabilities, chainId],
  );

  if (!ready) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Execution</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Mode:{" "}
            <span className="font-medium text-neutral-900">
              {method === "wallet" ? "wallet (EIP-5792 ready)" : "local (mock)"}
            </span>
          </p>
          {method === "wallet" ? (
            <p className="mt-1 text-sm text-neutral-600">
              Account:{" "}
              <span className="font-mono text-xs">
                {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "—"}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-600">
              Connect a wallet to enable capability-aware execution.
            </p>
          )}
          <p className="mt-1 text-sm text-neutral-600">
            Actions are mocked until contracts are wired.
          </p>
        </div>

        {method !== "wallet" ? (
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/auth"
          >
            Login
          </Link>
        ) : null}
      </div>

      {method === "wallet" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-600">
            Detect capabilities for this chain.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            disabled={status === "loading"}
            onClick={() => void onDetect()}
          >
            {status === "loading" ? "Detecting…" : "Detect"}
          </button>
        </div>
      ) : null}

      {status === "loaded" && capabilities ? (
        <div className="mt-4 text-sm text-neutral-700">
          <p>
            Chain:{" "}
            <span className="font-medium text-neutral-900">
              {chainId ?? "—"}
            </span>
          </p>
          <p className="mt-1">
            Atomic batch:{" "}
            <span className="font-medium text-neutral-900">
              {atomic === null
                ? "unknown"
                : atomic
                  ? "supported"
                  : "not supported"}
            </span>
          </p>
          <p className="mt-1">
            Paymaster service:{" "}
            <span className="font-medium text-neutral-900">
              {paymaster === null
                ? "unknown"
                : paymaster
                  ? "supported"
                  : "not supported"}
            </span>
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
