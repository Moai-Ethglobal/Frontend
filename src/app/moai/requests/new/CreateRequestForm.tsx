"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readMyMoai } from "@/lib/moai";
import type { CreateRequestInput } from "@/lib/requests";
import { createRequest } from "@/lib/requests";

type RequestType = Extract<
  CreateRequestInput["type"],
  "emergency_withdrawal" | "change_contribution"
>;

export function CreateRequestForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [moaiId, setMoaiId] = useState<string | null>(null);

  const [type, setType] = useState<RequestType>("emergency_withdrawal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [amountUSDC, setAmountUSDC] = useState("");

  const [newContributionUSDC, setNewContributionUSDC] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const moai = readMyMoai();
    setMoaiId(moai?.id ?? null);
    setReady(true);
  }, []);

  const canSubmit = useMemo(() => {
    if (!moaiId) return false;
    if (title.trim().length === 0) return false;
    if (type === "emergency_withdrawal") {
      return beneficiaryName.trim().length > 0 && amountUSDC.trim().length > 0;
    }
    return newContributionUSDC.trim().length > 0;
  }, [amountUSDC, beneficiaryName, moaiId, newContributionUSDC, title, type]);

  const onSubmit = () => {
    if (!moaiId) {
      setError("Create a Moai first.");
      return;
    }

    const base = {
      moaiId,
      title,
      description,
    };

    const input: CreateRequestInput =
      type === "emergency_withdrawal"
        ? {
            ...base,
            type: "emergency_withdrawal",
            beneficiaryName,
            amountUSDC,
          }
        : {
            ...base,
            type: "change_contribution",
            newContributionUSDC,
          };

    if (input.title.trim().length === 0) {
      setError("Title is required.");
      return;
    }

    if (
      input.type === "emergency_withdrawal" &&
      (input.beneficiaryName.trim().length === 0 ||
        input.amountUSDC.trim().length === 0)
    ) {
      setError("Beneficiary and amount are required.");
      return;
    }

    if (
      input.type === "change_contribution" &&
      input.newContributionUSDC.trim().length === 0
    ) {
      setError("New monthly contribution is required.");
      return;
    }

    createRequest(input);
    router.push("/moai/requests");
  };

  if (!ready) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Loading…</p>
      </div>
    );
  }

  if (!moaiId) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">
          No Moai found in this browser yet. Create a Moai first.
        </p>
        <div className="mt-4">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            type="button"
            onClick={() => router.push("/moai/create")}
          >
            Create Moai
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6">
      <div>
        <label className="text-sm font-medium text-neutral-900" htmlFor="type">
          Type
        </label>
        <select
          className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as RequestType)}
        >
          <option value="emergency_withdrawal">Emergency withdrawal</option>
          <option value="change_contribution">
            Change monthly contribution
          </option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-900" htmlFor="title">
          Title
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          id="title"
          name="title"
          placeholder="Short reason"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label
          className="text-sm font-medium text-neutral-900"
          htmlFor="description"
        >
          Description
        </label>
        <textarea
          className="mt-2 min-h-28 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          id="description"
          name="description"
          placeholder="A short explanation"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {type === "emergency_withdrawal" ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-neutral-900"
              htmlFor="beneficiaryName"
            >
              Beneficiary
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              id="beneficiaryName"
              name="beneficiaryName"
              placeholder="Name"
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-neutral-900"
              htmlFor="amountUSDC"
            >
              Amount (USDC)
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              id="amountUSDC"
              name="amountUSDC"
              placeholder="e.g. 250"
              inputMode="decimal"
              value={amountUSDC}
              onChange={(e) => setAmountUSDC(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div>
          <label
            className="text-sm font-medium text-neutral-900"
            htmlFor="newContributionUSDC"
          >
            New monthly contribution (USDC)
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            id="newContributionUSDC"
            name="newContributionUSDC"
            placeholder="e.g. 50"
            inputMode="decimal"
            value={newContributionUSDC}
            onChange={(e) => setNewContributionUSDC(e.target.value)}
          />
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">
          Stored locally. Expires in 1 month.
        </p>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          Create request
        </button>
      </div>
    </div>
  );
}
