"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getKernelAccountAddress } from "@/lib/aa";
import { type AaConfig, readAaConfig, writeAaConfig } from "@/lib/aaConfig";
import { isEvmAddress, shortEvmAddress } from "@/lib/evm";
import {
  type OnchainMoaiConfig,
  readOnchainMoaiConfig,
  writeOnchainMoaiConfig,
} from "@/lib/onchainConfig";
import {
  contributeOnchain,
  distributeMonthOnchain,
  exitMoaiOnchain,
  joinOnchain,
  payOutstandingOnchain,
  proposeRemovalOnchain,
  readEmergencyRequestOnchain,
  readOnchainMoaiState,
  requestEmergencyOnchain,
  voteEmergencyOnchain,
  voteForDissolutionOnchain,
  voteRemovalOnchain,
  withdrawOnchain,
} from "@/lib/onchainMoai";
import { readSession, type SessionMethod } from "@/lib/session";
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
  const [sessionMethod, setSessionMethod] = useState<SessionMethod | null>(
    null,
  );

  const [aaCfg, setAaCfg] = useState<AaConfig | null>(null);
  const [aaRpcUrlInput, setAaRpcUrlInput] = useState("");
  const [aaPimlicoUrlInput, setAaPimlicoUrlInput] = useState("");
  const [aaChainIdInput, setAaChainIdInput] = useState("");
  const [aaAddress, setAaAddress] = useState<string | null>(null);
  const [aaError, setAaError] = useState<string | null>(null);

  const [status, setStatus] = useState<
    | "idle"
    | "loading"
    | "loaded"
    | "saving"
    | "joining"
    | "contributing"
    | "paying_outstanding"
    | "distributing"
    | "requesting"
    | "voting"
    | "withdrawing"
    | "removal_proposing"
    | "removal_voting"
    | "dissolving"
    | "exiting"
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

  const [removalMember, setRemovalMember] = useState("");
  const [removalRequestId, setRemovalRequestId] = useState("");

  const refresh = useCallback(async () => {
    setAaError(null);
    const nextCfg = readOnchainMoaiConfig();
    setCfg(nextCfg);
    setAddressInput(nextCfg?.moaiAddress ?? "");
    setChainIdInput(nextCfg?.chainId ? String(nextCfg.chainId) : "");

    const session = readSession();
    setSessionId(session?.id ?? null);
    setSessionMethod(session?.method ?? null);

    const nextAaCfg = readAaConfig();
    setAaCfg(nextAaCfg);
    setAaRpcUrlInput(nextAaCfg?.rpcUrl ?? "");
    setAaPimlicoUrlInput(nextAaCfg?.pimlicoUrl ?? "");
    setAaChainIdInput(
      nextAaCfg?.chainId
        ? String(nextAaCfg.chainId)
        : nextCfg?.chainId
          ? String(nextCfg.chainId)
          : "",
    );

    if (session?.id && !isEvmAddress(session.id)) {
      const addr = await getKernelAccountAddress({ identityId: session.id });
      setAaAddress(addr ?? null);
    } else {
      setAaAddress(null);
    }

    if (!nextCfg) {
      setState(null);
      setReady(true);
      return;
    }

    if (!session?.id) {
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

  const onSaveAa = () => {
    setAaError(null);
    const chainId = parseChainIdInput(aaChainIdInput);
    const rpcUrl = aaRpcUrlInput.trim();
    const pimlicoUrl = aaPimlicoUrlInput.trim();

    if (!chainId) {
      setAaError("Invalid AA chain id.");
      return;
    }
    if (!rpcUrl.startsWith("http")) {
      setAaError("Invalid AA RPC url.");
      return;
    }
    if (!pimlicoUrl.startsWith("http")) {
      setAaError("Invalid Pimlico url.");
      return;
    }

    writeAaConfig({ chainId, rpcUrl, pimlicoUrl });
    void refresh();
  };

  const onClearAa = () => {
    setAaError(null);
    writeAaConfig(null);
    void refresh();
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

  const onPayOutstanding = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("paying_outstanding");

    const result = await payOutstandingOnchain({
      sessionId,
      amountUSDC: "all",
    });
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

  const onProposeRemoval = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("removal_proposing");

    const result = await proposeRemovalOnchain({
      sessionId,
      member: removalMember,
    });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setTxHashes([result.hash]);
    setRemovalRequestId(result.requestId.toString());
    setStatus("loaded");
    void refresh();
  };

  const onVoteRemoval = async (approve: boolean) => {
    setError(null);
    setTxHashes([]);
    const trimmed = removalRequestId.trim();
    if (!trimmed.length) {
      setError("Enter a removal request id.");
      return;
    }
    let id: bigint;
    try {
      id = BigInt(trimmed);
    } catch {
      setError("Invalid removal request id.");
      return;
    }

    setStatus("removal_voting");
    const result = await voteRemovalOnchain({
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
    void refresh();
  };

  const onVoteDissolution = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("dissolving");

    const result = await voteForDissolutionOnchain({ sessionId });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setTxHashes([result.hash]);
    setStatus("loaded");
    void refresh();
  };

  const onExit = async () => {
    setError(null);
    setTxHashes([]);
    setStatus("exiting");

    const result = await exitMoaiOnchain({ sessionId });
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

      <div className="mt-6 rounded-lg border border-neutral-200 p-3">
        <p className="text-xs font-medium text-neutral-700">AA (optional)</p>
        <p className="mt-2 text-sm text-neutral-700">
          Enable gas-sponsored smart account execution for passkey/email
          sessions.
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          Status: {aaCfg ? "configured" : "not configured"}
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-neutral-700">
              Chain ID
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
              value={aaChainIdInput}
              placeholder="e.g. 11155111"
              onChange={(e) => setAaChainIdInput(e.target.value)}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-neutral-700">
              RPC URL
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
              value={aaRpcUrlInput}
              placeholder="https://…"
              onChange={(e) => setAaRpcUrlInput(e.target.value)}
            />
          </label>

          <label className="block sm:col-span-3">
            <span className="text-xs font-medium text-neutral-700">
              Pimlico URL
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
              value={aaPimlicoUrlInput}
              placeholder="https://api.pimlico.io/v2/…/rpc?apikey=…"
              onChange={(e) => setAaPimlicoUrlInput(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            type="button"
            onClick={onSaveAa}
          >
            Save AA
          </button>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            type="button"
            onClick={onClearAa}
          >
            Clear AA
          </button>
        </div>

        {aaAddress ? (
          <p className="mt-3 text-sm text-neutral-700">
            AA account:{" "}
            <span className="font-mono text-xs">
              {shortEvmAddress(aaAddress)}
            </span>
          </p>
        ) : null}
        {aaError ? (
          <p className="mt-3 text-sm text-red-600">{aaError}</p>
        ) : null}
      </div>

      {cfg?.moaiAddress ? (
        <div className="mt-5 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
          <p>
            Session:{" "}
            <span className="font-medium text-neutral-900">
              {sessionMethod ?? "—"}
            </span>
          </p>
          <p className="mt-1">
            Account:{" "}
            <span className="font-mono text-xs">
              {state?.account
                ? shortEvmAddress(state.account)
                : sessionId && isEvmAddress(sessionId)
                  ? shortEvmAddress(sessionId)
                  : aaAddress && isEvmAddress(aaAddress)
                    ? shortEvmAddress(aaAddress)
                    : "—"}
            </span>
          </p>
          <p className="mt-2">
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
              {state.moaiName ? (
                <p className="mt-2 text-base font-semibold text-neutral-900">
                  {state.moaiName}
                </p>
              ) : null}

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <p>
                  Member:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.isMember ? "yes" : "no"}
                  </span>
                </p>
                <p>
                  Members:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.activeMemberCount.toString()}
                  </span>
                </p>
              </div>

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
                  Available distribution:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.availableDistributionUSDC} USDC
                  </span>
                </p>
                <p>
                  Emergency reserve:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.emergencyReserveUSDC} USDC
                  </span>
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p>
                  Outstanding:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.outstandingUSDC} USDC
                  </span>
                </p>
                <p>
                  Pending payout:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.pendingDistributionUSDC} USDC
                  </span>
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p>
                  Current recipient:{" "}
                  <span className="font-mono text-xs font-medium text-neutral-900">
                    {state.currentRecipient
                      ? shortEvmAddress(state.currentRecipient)
                      : "—"}
                  </span>
                </p>
                <p>
                  Next distribution:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.nextDistributionDate > 0n
                      ? new Date(
                          Number(state.nextDistributionDate) * 1000,
                        ).toLocaleDateString()
                      : "—"}
                  </span>
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p>
                  Dissolution:{" "}
                  <span className="font-medium text-neutral-900">
                    {state.isDissolved ? "dissolved" : "active"}
                  </span>{" "}
                  <span className="text-neutral-600">
                    ({state.dissolutionVotes.toString()} votes)
                  </span>
                </p>
                {state.isDissolved ? (
                  <p>
                    Share:{" "}
                    <span className="font-medium text-neutral-900">
                      {state.dissolutionShareUSDC} USDC
                    </span>
                  </p>
                ) : null}
              </div>

              <p className="mt-3 text-base font-medium">
                Withdrawable:{" "}
                <span className="text-neutral-900">
                  {state.withdrawableUSDC} USDC
                </span>{" "}
                <span className="text-sm text-neutral-600">
                  ({state.withdrawReason})
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
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                      type="button"
                      disabled={
                        chainMismatch ||
                        status === "paying_outstanding" ||
                        state.outstandingUSDC === "0"
                      }
                      onClick={() => void onPayOutstanding()}
                    >
                      {status === "paying_outstanding"
                        ? "Paying…"
                        : "Pay outstanding"}
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
                  Emergency request (onchain)
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Max per request: 15% of emergency reserve
                  {state.emergencyReserveUSDC !== "0"
                    ? ` (approx. ${(Number.parseFloat(state.emergencyReserveUSDC.replace(/,/g, "")) * 0.15).toFixed(2)} USDC)`
                    : ""}
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
                        ({emergencyInfo.executed ? "executed" : "open"})
                      </span>
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-xs font-medium text-neutral-700">
                  Governance (onchain)
                </p>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-neutral-700">
                      Member address
                    </span>
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
                      value={removalMember}
                      placeholder="0x…"
                      onChange={(e) => setRemovalMember(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-neutral-700">
                      Removal request id
                    </span>
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
                      value={removalRequestId}
                      placeholder="e.g. 0"
                      inputMode="numeric"
                      onChange={(e) => setRemovalRequestId(e.target.value)}
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
                      status === "removal_proposing" ||
                      removalMember.trim().length === 0
                    }
                    onClick={() => void onProposeRemoval()}
                  >
                    {status === "removal_proposing"
                      ? "Proposing…"
                      : "Propose removal"}
                  </button>

                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={
                      chainMismatch ||
                      !state.isMember ||
                      status === "removal_voting" ||
                      removalRequestId.trim().length === 0
                    }
                    onClick={() => void onVoteRemoval(true)}
                  >
                    {status === "removal_voting" ? "Voting…" : "Vote yes"}
                  </button>

                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={
                      chainMismatch ||
                      !state.isMember ||
                      status === "removal_voting" ||
                      removalRequestId.trim().length === 0
                    }
                    onClick={() => void onVoteRemoval(false)}
                  >
                    Vote no
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={
                      chainMismatch ||
                      !state.isMember ||
                      state.isDissolved ||
                      status === "dissolving"
                    }
                    onClick={() => void onVoteDissolution()}
                  >
                    {status === "dissolving"
                      ? "Voting…"
                      : state.isDissolved
                        ? "Dissolved"
                        : "Vote dissolution"}
                  </button>

                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={
                      chainMismatch || !state.isMember || status === "exiting"
                    }
                    onClick={() => void onExit()}
                  >
                    {status === "exiting" ? "Exiting…" : "Exit Moai"}
                  </button>
                </div>
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
