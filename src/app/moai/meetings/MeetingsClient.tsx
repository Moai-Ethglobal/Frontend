"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Meeting } from "@/lib/meetings";
import { checkInMeeting, ensureMeeting, monthKey } from "@/lib/meetings";
import { readMyMoai } from "@/lib/moai";
import { readSession } from "@/lib/session";

export function MeetingsClient() {
  const [ready, setReady] = useState(false);
  const [moaiId, setMoaiId] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = useMemo(() => monthKey(), []);

  useEffect(() => {
    const moai = readMyMoai();
    const session = readSession();
    setMoaiId(moai?.id ?? null);
    setVoterId(session?.id ?? null);
    setMeeting(moai ? ensureMeeting(moai.id, currentMonth) : null);
    setReady(true);
  }, [currentMonth]);

  const checkedInAt = voterId
    ? meeting?.attendanceByVoterId[voterId]
    : undefined;
  const attendeeCount = meeting
    ? Object.keys(meeting.attendanceByVoterId).length
    : 0;

  const canCheckIn = Boolean(meeting) && Boolean(voterId) && !checkedInAt;

  const onCheckIn = () => {
    setError(null);
    if (!moaiId) {
      setError("Create a Moai first.");
      return;
    }
    if (!voterId) {
      setError("Login to check in.");
      return;
    }

    setMeeting(
      checkInMeeting({
        moaiId,
        month: currentMonth,
        voterId,
      }),
    );
  };

  if (!ready) {
    return <p className="mt-10 text-sm text-neutral-600">Loading…</p>;
  }

  if (!moaiId) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">
          No Moai found in this browser yet.
        </p>
        <div className="mt-4">
          <Link
            className="text-sm font-medium text-neutral-900 hover:underline"
            href="/moai/create"
          >
            Create a Moai
          </Link>
        </div>
      </div>
    );
  }

  if (!voterId) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">
          Login to check in for this month&apos;s meeting.
        </p>
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

  if (!meeting) {
    return (
      <p className="mt-10 text-sm text-neutral-600">
        Couldn&apos;t load meeting data.
      </p>
    );
  }

  return (
    <div className="mt-10 space-y-4">
      <div className="rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">This month</h2>
        <div className="mt-2 text-sm text-neutral-700">
          <p>Month: {meeting.month}</p>
          <p>
            Scheduled: {new Date(meeting.scheduledAt).toLocaleString(undefined)}
          </p>
          <p>Attendance: {attendeeCount}</p>
          <p>
            Status:{" "}
            <span className="font-medium text-neutral-900">
              {checkedInAt ? "checked in" : "not checked in"}
            </span>
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            disabled={!canCheckIn}
            onClick={onCheckIn}
          >
            Check in
          </button>
        </div>

        {checkedInAt ? (
          <p className="mt-3 text-sm text-neutral-600">
            Checked in at {new Date(checkedInAt).toLocaleString(undefined)}.
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
