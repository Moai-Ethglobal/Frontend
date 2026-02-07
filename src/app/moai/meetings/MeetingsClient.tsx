"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Meeting } from "@/lib/meetings";
import { checkInMeeting, ensureMeeting } from "@/lib/meetings";
import { readMyMoai } from "@/lib/moai";
import { readSession } from "@/lib/session";
import { monthKey } from "@/lib/time";

const HuddleJoinPanel = dynamic(() => import("./HuddleJoinPanel"), {
  ssr: false,
});

export function MeetingsClient() {
  const [ready, setReady] = useState(false);
  const [moaiId, setMoaiId] = useState<string | null>(null);
  const [moaiName, setMoaiName] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [huddleError, setHuddleError] = useState<string | null>(null);
  const [huddleLoading, setHuddleLoading] = useState(false);

  useEffect(() => {
    const currentMonth = monthKey(new Date());
    const moai = readMyMoai();
    const session = readSession();
    setMoaiId(moai?.id ?? null);
    setMoaiName(moai?.name ?? null);
    setVoterId(session?.id ?? null);
    setMonth(currentMonth);
    setMeeting(moai ? ensureMeeting(moai.id, currentMonth) : null);
    setReady(true);
  }, []);

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
    if (!month) {
      setError("Missing month context.");
      return;
    }

    setMeeting(
      checkInMeeting({
        moaiId,
        month,
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

  const onCreateRoom = async () => {
    setHuddleError(null);
    setHuddleLoading(true);
    setRoomId(null);
    setToken(null);
    try {
      const res = await fetch("/api/huddle/create-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: moaiName && month ? `${moaiName} · ${month}` : "Moai meeting",
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        roomId?: unknown;
        error?: unknown;
      } | null;
      const nextRoomId = json?.roomId;
      if (
        !res.ok ||
        typeof nextRoomId !== "string" ||
        nextRoomId.length === 0
      ) {
        setHuddleError("Unable to create room. Check HUDDLE_API_KEY.");
        setHuddleLoading(false);
        return;
      }
      setRoomId(nextRoomId);
    } catch {
      setHuddleError("Unable to create room.");
    } finally {
      setHuddleLoading(false);
    }
  };

  const onGetToken = async () => {
    if (!roomId) return;
    setHuddleError(null);
    setHuddleLoading(true);
    setToken(null);
    try {
      const res = await fetch(
        `/api/huddle/token?roomId=${encodeURIComponent(roomId)}`,
      );
      const json = (await res.json().catch(() => null)) as {
        token?: unknown;
      } | null;
      const nextToken = json?.token;
      if (!res.ok || typeof nextToken !== "string" || nextToken.length === 0) {
        setHuddleError("Unable to generate token. Check HUDDLE_API_KEY.");
        setHuddleLoading(false);
        return;
      }
      setToken(nextToken);
    } catch {
      setHuddleError("Unable to generate token.");
    } finally {
      setHuddleLoading(false);
    }
  };

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

      <div className="rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Huddle01</h2>
        <p className="mt-2 text-sm text-neutral-700">
          Room and access token are generated server-side.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            disabled={huddleLoading}
            onClick={() => void onCreateRoom()}
          >
            Create room
          </button>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
            type="button"
            disabled={huddleLoading || !roomId}
            onClick={() => void onGetToken()}
          >
            Get token
          </button>
        </div>

        {roomId ? (
          <p className="mt-3 text-sm text-neutral-700">
            Room:{" "}
            <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
              {roomId}
            </span>
          </p>
        ) : null}

        {token ? (
          <p className="mt-2 text-sm text-neutral-700">
            Token:{" "}
            <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
              {token.slice(0, 16)}…{token.slice(-8)}
            </span>
          </p>
        ) : null}

        {huddleError ? (
          <p className="mt-3 text-sm text-red-600">{huddleError}</p>
        ) : null}

        {roomId && token ? (
          <HuddleJoinPanel roomId={roomId} token={token} />
        ) : null}

        <p className="mt-3 text-sm text-neutral-600">
          Set <span className="font-mono text-xs">HUDDLE_API_KEY</span> in{" "}
          <span className="font-mono text-xs">.env</span> to enable.
        </p>
      </div>
    </div>
  );
}
