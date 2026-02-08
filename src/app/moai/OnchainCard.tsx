"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isEvmAddress, shortEvmAddress } from "@/lib/evm";
import {
  type OnchainMoaiConfig,
  readOnchainMoaiConfig,
  writeOnchainMoaiConfig,
} from "@/lib/onchainConfig";
import {
  contributeOnchain,
  distributeMonthOnchain,
  joinOnchain,
  readEmergencyRequestOnchain,
  readOnchainMoaiState,
  requestEmergencyOnchain,
  voteEmergencyOnchain,
  withdrawOnchain,
} from "@/lib/onchainMoai";
import { readSession } from "@/lib/session";
import { STORAGE_CHANGE_EVENT, type StorageChangeDetail } from "@/lib/storage";

function parseChainIdInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed.length) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  if (n <= 0) return undefined;
  return Math.trunc(n);
}

export function OnchainCard() {
  const [ready, setReady] = useState(false);
  const [cfg, setCfg] = useState<OnchainMoaiConfig | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [chainIdInput, setChainIdInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [status, setStatus] = useState<
    | "idle"
    | "loading"
    | "loaded"
    | "saving"
    | "joining"
    | "contributing"
    | "distributing"
    | "requesting"
    | "voting"
    | "withdrawing"
    | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [state, setState] = useState<Awaited<
    ReturnType<typeof readOnchainMoaiState>
  > | null>(null);

  const [emergencyAmount, setEmergencyAmount] = useState("");
  const [emergencyRequestId, setEmergencyRequestId] = useState("");
  const [emergencyInfo, setEmergencyInfo] = useState<Awaited<
    ReturnType<typeof readEmergencyRequestOnchain>
  > | null>(null);

  const refresh = useCallback(async () => {
    const nextCfg = readOnchainMoaiConfig();
    setCfg(nextCfg);
    setAddressInput(nextCfg?.moaiAddress ?? "");
    setChainIdInput(nextCfg?.chainId ? String(nextCfg.chainId) : "");

    const session = readSession();
    setSessionId(session?.id ?? null);

    if (!nextCfg) {
      setState(null);
      setReady(true);
      return;
    }

    if (session?.method !== "wallet") {
      setState(null);
      setReady(true);
      return;
    }

    setStatus("loading");
    setError(null);
    const nextState = await readOnchainMoaiState({ sessionId: session.id });
    setState(nextState);
    setStatus("loaded");
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();

    const onChanged = (evt: Event) => {
      const detail = (evt as CustomEvent<StorageChangeDetail>).detail;
      if (!detail?.key) return;
      if (detail.key !== "moai.onchain.v1" && detail.key !== "moai.session.v1")
        return;
      void refresh();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, onChanged);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onChanged);
  }, [refresh]);

  const chainMismatch = useMemo(() => {
    if (!cfg?.chainId) return false;
    if (!state?.chainId) return false;
    return cfg.chainId !== state.chainId;
  }, [cfg?.chainId, state?.chainId]);

  const canWithdraw = Boolean(
    state?.isMember &&
      state?.withdrawReason !== "none" &&
      !chainMismatch &&
      status !== "withdrawing",
  );

  const onSave = () => {
    setError(null);
    setTxHashes([]);
    setStatus("saving");

    const addr = addressInput.trim();
    if (!isEvmAddress(addr)) {
      setStatus("error");
      setError("Invalid contract address.");
      return;
    }

    const chainId = parseChainIdInput(chainIdInput);
    writeOnchainMoaiConfig({ moaiAddress: addr, chainId });
    setStatus("idle");
  };

  const onClear = () => {
    setError(null);
    setTxHashes([]);
    writeOnchainMoaiConfig(null);
  };

  const onJoin = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("joining");
    const result = await joinOnchain({ sessionId });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setTxHashes([result.hash]);
    setStatus("loaded");
    void refresh();
  };

  const onContribute = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("contributing");
    const result = await contributeOnchain({ sessionId });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setTxHashes([...result.hashes]);
    setStatus("loaded");
    void refresh();
  };

  const onDistribute = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("distributing");
    const result = await distributeMonthOnchain({ sessionId });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setTxHashes([result.hash]);
    setStatus("loaded");
    void refresh();
  };

  const onRequestEmergency = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("requesting");
    const result = await requestEmergencyOnchain({
      sessionId,
      amountUSDC: emergencyAmount,
    });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setTxHashes([result.hash]);
    setEmergencyRequestId(result.requestId.toString());
    setStatus("loaded");
    void refresh();
  };

  const onLoadEmergency = async () => {
    setError(null);
    setEmergencyInfo(null);
    const trimmed = emergencyRequestId.trim();
    if (!trimmed.length) {
      setError("Enter a request id.");
      return;
    }
    let id: bigint;
    try {
      id = BigInt(trimmed);
    } catch {
      setError("Invalid request id.");
      return;
    }

    setStatus("loading");
    const info = await readEmergencyRequestOnchain({
      sessionId,
      requestId: id,
    });
    setEmergencyInfo(info);
    setStatus("loaded");
  };

  const onVoteEmergency = async (approve: boolean) => {
    setError(null);
    setTxHashes([]);
    const trimmed = emergencyRequestId.trim();
    if (!trimmed.length) {
      setError("Enter a request id.");
      return;
    }
    let id: bigint;
    try {
      id = BigInt(trimmed);
    } catch {
      setError("Invalid request id.");
      return;
    }

    setStatus("voting");
    const result = await voteEmergencyOnchain({
      sessionId,
      requestId: id,
      approve,
    });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setTxHashes([result.hash]);
    setStatus("loaded");
    void onLoadEmergency();
    void refresh();
  };

  const onWithdraw = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("withdrawing");

    const result = await withdrawOnchain({ sessionId });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setTxHashes([result.hash]);
    setStatus("loaded");
    void refresh();
  };

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
          <h2 className="text-sm font-semibold">Onchain</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Link a deployed Moai contract (optional).
          </p>
          {cfg?.moaiAddress ? (
            <p className="mt-1 text-sm text-neutral-600">
              Contract:{" "}
              <span className="font-mono text-xs">
                {shortEvmAddress(cfg.moaiAddress)}
              </span>
              {cfg.chainId ? (
                <span className="ml-2">chain {cfg.chainId}</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-600">
              Not linked (mock mode).
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-neutral-700">
            Moai contract address
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
            value={addressInput}
            placeholder="0x…"
            onChange={(e) => setAddressInput(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-neutral-700">
            Chain ID (optional)
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
            value={chainIdInput}
            placeholder="e.g. 8453"
            onChange={(e) => setChainIdInput(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={status === "saving"}
          onClick={onSave}
        >
          Save
        </button>
        <button
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          type="button"
          onClick={onClear}
        >
          Clear
        </button>
        <button
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
          type="button"
          disabled={status === "loading" || status === "withdrawing"}
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>

      {cfg?.moaiAddress ? (
        <div className="mt-5 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
          <p>
            Wallet:{" "}
            <span className="font-mono text-xs">
              {sessionId ? shortEvmAddress(sessionId) : "—"}
            </span>
          </p>
          <p className="mt-1">
            Chain:{" "}
            <span className="font-medium text-neutral-900">
              {state?.chainId ?? "—"}
            </span>
            {chainMismatch ? (
              <span className="ml-2 text-red-600">
                (switch to chain {cfg.chainId})
              </span>
            ) : null}
          </p>

          {state ? (
            <>
              <p className="mt-2">
                Member:{" "}
                <span className="font-medium text-neutral-900">
                  {state.isMember ? "yes" : "no"}
                </span>
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p>
                  Contribution:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.contributionAmountUSDC} USDC
                  </span>
                </p>
                <p>
                  Month:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.currentMonth.toString()}
                  </span>{" "}
                  <span className="text-neutral-600">
                    ({state.paidThisMonth ? "paid" : "unpaid"})
                  </span>
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p>
                  Distribution pot:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.distributionPotUSDC} USDC
                  </span>
                </p>
                <p>
                  Emergency reserve:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.emergencyReserveUSDC} USDC
                  </span>
                </p>
              </div>

              <p className="mt-3">
                Withdrawable:{" "}
                <span className="font-medium text-neutral-900">
                  {state.withdrawableUSDC} USDC
                </span>{" "}
                <span className="text-neutral-600">
                  ({state.withdrawReason}
                  {state.withdrawReason === "round_robin"
                    ? ` · month ${state.withdrawRefId}`
                    : ""}
                  )
                </span>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!state.isMember ? (
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    type="button"
                    disabled={chainMismatch || status === "joining"}
                    onClick={() => void onJoin()}
                  >
                    {status === "joining" ? "Joining…" : "Join onchain"}
                  </button>
                ) : null}

                {state.isMember ? (
                  <>
                    <button
                      className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      type="button"
                      disabled={
                        chainMismatch ||
                        status === "contributing" ||
                        state.paidThisMonth
                      }
                      onClick={() => void onContribute()}
                    >
                      {status === "contributing"
                        ? "Contributing…"
                        : state.paidThisMonth
                          ? "Contributed"
                          : "Contribute onchain"}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                      type="button"
                      disabled={chainMismatch || status === "distributing"}
                      onClick={() => void onDistribute()}
                    >
                      {status === "distributing"
                        ? "Distributing…"
                        : "Distribute month"}
                    </button>
                  </>
                ) : null}

                <button
                  className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  type="button"
                  disabled={!canWithdraw}
                  onClick={() => void onWithdraw()}
                >
                  {status === "withdrawing"
                    ? "Withdrawing…"
                    : "Withdraw onchain"}
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-xs font-medium text-neutral-700">
                  Emergency (onchain)
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-neutral-700">
                      Amount (USDC)
                    </span>
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
                      value={emergencyAmount}
                      placeholder="e.g. 50"
                      inputMode="decimal"
                      onChange={(e) => setEmergencyAmount(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-neutral-700">
                      Request id
                    </span>
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
                      value={emergencyRequestId}
                      placeholder="e.g. 0"
                      inputMode="numeric"
                      onChange={(e) => setEmergencyRequestId(e.target.value)}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    type="button"
                    disabled={
                      chainMismatch ||
                      !state.isMember ||
                      status === "requesting" ||
                      emergencyAmount.trim().length === 0
                    }
                    onClick={() => void onRequestEmergency()}
                  >
                    {status === "requesting" ? "Requesting…" : "Request"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={chainMismatch || status === "loading"}
                    onClick={() => void onLoadEmergency()}
                  >
                    Load
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={
                      chainMismatch || !state.isMember || status === "voting"
                    }
                    onClick={() => void onVoteEmergency(true)}
                  >
                    {status === "voting" ? "Voting…" : "Vote yes"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={
                      chainMismatch || !state.isMember || status === "voting"
                    }
                    onClick={() => void onVoteEmergency(false)}
                  >
                    Vote no
                  </button>
                </div>

                {emergencyInfo ? (
                  <div className="mt-3 text-sm text-neutral-700">
                    <p>
                      Beneficiary:{" "}
                      <span className="font-mono text-xs">
                        {shortEvmAddress(emergencyInfo.beneficiary)}
                      </span>
                    </p>
                    <p className="mt-1">
                      Amount:{" "}
                      <span className="font-medium text-neutral-900">
                        {emergencyInfo.amountUSDC} USDC
                      </span>
                    </p>
                    <p className="mt-1">
                      Approvals:{" "}
                      <span className="font-medium text-neutral-900">
                        {emergencyInfo.approvalCount.toString()}
                      </span>{" "}
                      <span className="text-neutral-600">
                        ({emergencyInfo.approved ? "approved" : "open"})
                      </span>
                    </p>
                  </div>
                ) : null}
              </div>

              {txHashes.length > 0 ? (
                <div className="mt-3 text-xs text-neutral-600">
                  {txHashes.map((h) => (
                    <p className="font-mono" key={h}>
                      tx {h.slice(0, 10)}…{h.slice(-6)}
                    </p>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-neutral-600">
              Login with a wallet to load onchain state.
            </p>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
