"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createRequestAction, uploadProofAction } from "@/lib/actions";
import { isActiveMemberId, isMemberActive, readMyMoai } from "@/lib/moai";
import { toProofRef } from "@/lib/proofs";
import type { CreateRequestInput } from "@/lib/requests";
import { readSession } from "@/lib/session";

type Status = "idle" | "uploading" | "submitting" | "done" | "error";
type ReportType = Extract<CreateRequestInput["type"], "demise" | "awol">;

export function DemiseClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [moaiId, setMoaiId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [memberActive, setMemberActive] = useState(false);

  const [type, setType] = useState<ReportType>("awol");
  const [subjectMemberId, setSubjectMemberId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const moai = readMyMoai();
    const session = readSession();
    setMoaiId(moai?.id ?? null);
    setMembers(
      (moai?.members ?? [])
        .filter(isMemberActive)
        .map((m) => ({ id: m.id, name: m.displayName })),
    );
    setVoterId(session?.id ?? null);
    setMemberActive(
      Boolean(moai && session?.id && isActiveMemberId(moai, session.id)),
    );
    setReady(true);
  }, []);

  const subjectName = useMemo(() => {
    const trimmed = subjectMemberId.trim();
    if (!trimmed.length) return null;
    return members.find((m) => m.id === trimmed)?.name ?? null;
  }, [members, subjectMemberId]);

  const canSubmit = useMemo(() => {
    if (!moaiId) return false;
    if (!voterId) return false;
    if (subjectMemberId.trim().length === 0) return false;
    if (title.trim().length === 0) return false;
    if (!subjectName) return false;
    if (files.length === 0) return false;
    if (status === "uploading" || status === "submitting") return false;
    return true;
  }, [
    files.length,
    moaiId,
    status,
    subjectMemberId,
    subjectName,
    title,
    voterId,
  ]);

  const onFilesChanged = (fileList: FileList | null) => {
    setError(null);
    if (!fileList || fileList.length === 0) {
      setFiles([]);
      return;
    }
    setFiles(Array.from(fileList));
  };

  const onSubmit = async () => {
    setError(null);
    if (!moaiId) {
      setError("Create a Moai first.");
      return;
    }
    if (!voterId) {
      setError("Login to submit.");
      return;
    }

    const memberId = subjectMemberId.trim();
    if (!memberId.length) {
      setError("Pick a member.");
      return;
    }

    if (!subjectName) {
      setError("Invalid member.");
      return;
    }

    if (title.trim().length === 0) {
      setError("Title is required.");
      return;
    }

    if (files.length === 0) {
      setError("Attach at least 1 proof file.");
      return;
    }

    setStatus("uploading");
    const proofRefs: ReturnType<typeof toProofRef>[] = [];

    for (const file of files) {
      const result = await uploadProofAction({ file });
      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }
      proofRefs.push(toProofRef(result.proof));
    }

    setStatus("submitting");

    const input: CreateRequestInput = {
      moaiId,
      type,
      title,
      description,
      subjectMemberId: memberId,
      subjectMemberName: subjectName,
      proofs: proofRefs,
    };

    const request = createRequestAction(input);
    setStatus("done");
    router.push(`/moai/requests/${request.id}`);
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
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai/create"
          >
            Create Moai
          </Link>
        </div>
      </div>
    );
  }

  if (!voterId) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">Login to submit a report.</p>
        <div className="mt-4">
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/auth"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (!memberActive) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">
          This account is not an active member of this Moai.
        </p>
        <div className="mt-4">
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/auth"
          >
            Switch account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6">
      <div className="rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Submit a report</h2>
        <p className="mt-2 text-sm text-neutral-700">
          Stored locally for now. Requires 2 approvals.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-900" htmlFor="type">
          Type
        </label>
        <select
          className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ReportType)}
        >
          <option value="awol">AWOL (inactive / unresponsive)</option>
          <option value="demise">Demise (deceased)</option>
        </select>
      </div>

      <div>
        <label
          className="text-sm font-medium text-neutral-900"
          htmlFor="subjectMemberId"
        >
          Member
        </label>
        <select
          className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          id="subjectMemberId"
          name="subjectMemberId"
          value={subjectMemberId}
          onChange={(e) => setSubjectMemberId(e.target.value)}
        >
          <option value="">Select a member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
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

      <div>
        <label
          className="text-sm font-medium text-neutral-900"
          htmlFor="proofs"
        >
          Proof files
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          id="proofs"
          multiple
          type="file"
          onChange={(e) => onFilesChanged(e.target.files)}
        />
        {files.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-neutral-700">
            {files.map((f) => (
              <li key={`${f.name}:${f.size}`}>
                {f.name} ({Math.round(f.size / 1024)} KB)
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">
          {status === "uploading"
            ? "Uploading proofs…"
            : status === "submitting"
              ? "Submitting…"
              : "A vote will open in Requests."}
        </p>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={!canSubmit}
          onClick={() => void onSubmit()}
        >
          Submit report
        </button>
      </div>
    </div>
  );
}
