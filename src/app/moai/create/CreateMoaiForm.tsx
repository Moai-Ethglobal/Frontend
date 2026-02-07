"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { generateInviteCode } from "@/lib/invite";

type FieldProps = {
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: "text" | "email";
  value: string;
  onChange: (value: string) => void;
};

function Field({
  id,
  label,
  name,
  placeholder,
  type = "text",
  value,
  onChange,
}: FieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-900" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        id={id}
        name={name}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function CreateMoaiForm() {
  const [moaiName, setMoaiName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const invitePath = inviteCode ? `/invite/${inviteCode}` : null;

  const inviteUrl = useMemo(() => {
    if (!invitePath) return null;
    if (typeof window === "undefined") return invitePath;
    return `${window.location.origin}${invitePath}`;
  }, [invitePath]);

  const canCreate = moaiName.trim().length > 0 && displayName.trim().length > 0;

  const onCreate = () => {
    const code = generateInviteCode();
    setInviteCode(code);
    setCopyState("idle");
  };

  const onCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className="mt-10 space-y-6">
      <div className="grid gap-6">
        <Field
          id="moaiName"
          label="Moai name"
          name="moaiName"
          placeholder="e.g. Sunny Circle"
          value={moaiName}
          onChange={setMoaiName}
        />
        <Field
          id="displayName"
          label="Your name"
          name="displayName"
          placeholder="e.g. Kun"
          value={displayName}
          onChange={setDisplayName}
        />
        <Field
          id="email"
          label="Email"
          name="email"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={setEmail}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">
          Invite link is created locally for now.
        </p>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={!canCreate}
          onClick={onCreate}
        >
          Create Moai
        </button>
      </div>

      {inviteUrl ? (
        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Invite link</h2>
            <div className="flex items-center gap-3 text-sm">
              <Link
                className="text-neutral-900 hover:underline"
                href={invitePath ?? "/"}
              >
                Open
              </Link>
              <button
                className="text-neutral-900 hover:underline"
                type="button"
                onClick={onCopy}
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy"}
              </button>
            </div>
          </div>
          <div className="mt-3">
            <input
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900"
              readOnly
              value={inviteUrl}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
