"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { checkInMeetingAction } from "@/lib/actions";
import { createHuddleRoom, getHuddleToken } from "@/lib/huddle";
import { downloadIcs, generateMeetingIcs } from "@/lib/ics";
import type { Meeting } from "@/lib/meetings";
import {
  ensureMeeting,
  getCheckInReceiptId,
  setMeetingRoomId,
} from "@/lib/meetings";
import type { MyMoai } from "@/lib/moai";
import { isActiveMemberId, readMyMoai } from "@/lib/moai";
import { readSession } from "@/lib/session";
import { monthKey } from "@/lib/time";

const HuddleJoinPanel = dynamic(() => import("./HuddleJoinPanel"), {
  ssr: false,
});

export function MeetingsClient() {
  const [ready, setReady] = useState(false);
  const [moai, setMoai] = useState<MyMoai | null>(null);
  const [moaiId, setMoaiId] = useState<string | null>(null);
  const [moaiName, setMoaiName] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [huddleError, setHuddleError] = useState<string | null>(null);
  const [huddleLoading, setHuddleLoading] = useState(false);
  const [autoJoin, setAutoJoin] = useState(false);

  useEffect(() => {
    const currentMonth = monthKey(new Date());
    const currentMoai = readMyMoai();
    const session = readSession();
    setMoai(currentMoai);
    setMoaiId(currentMoai?.id ?? null);
    setMoaiName(currentMoai?.name ?? null);
    setVoterId(session?.id ?? null);
    setMonth(currentMonth);
    setMeeting(
      currentMoai ? ensureMeeting(currentMoai.id, currentMonth) : null,
    );
    setReady(true);
  }, []);

  const roomId = meeting?.huddleRoomId ?? null;

  const checkedInAt = voterId
    ? meeting?.attendanceByVoterId[voterId]
    : undefined;
  const receiptId =
    voterId && moaiId && month
      ? getCheckInReceiptId({ moaiId, month, voterId })
      : null;
  const attendeeCount = meeting
    ? Object.keys(meeting.attendanceByVoterId).length
    : 0;

  const memberActive = Boolean(
    moai && voterId && isActiveMemberId(moai, voterId),
  );

  const canCheckIn =
    Boolean(meeting) && Boolean(voterId) && memberActive && !checkedInAt;

  const onCheckIn = (input?: { silent?: boolean }) => {
    if (checkedInAt) return;
    if (!input?.silent) setError(null);
    if (!moaiId) {
      if (!input?.silent) setError("Create a Moai first.");
      return;
    }
    if (!voterId) {
      if (!input?.silent) setError("Login to check in.");
      return;
    }
    if (!memberActive) {
      if (!input?.silent) setError("Only active members can check in.");
      return;
    }
    if (!month) {
      if (!input?.silent) setError("Missing month context.");
      return;
    }

    setMeeting(
      checkInMeetingAction({
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

  if (!meeting) {
    return (
      <p className="mt-10 text-sm text-neutral-600">
        Couldn&apos;t load meeting data.
      </p>
    );
  }

  const onCreateRoom = async () => {
    setAutoJoin(false);
    setHuddleError(null);
    setHuddleLoading(true);
    setToken(null);
    try {
      if (!memberActive) {
        setHuddleError("Only members can create rooms.");
        return;
      }
      const result = await createHuddleRoom({
        title: moaiName && month ? `${moaiName} · ${month}` : "Moai meeting",
      });

      if (!result.ok) {
        setHuddleError(result.error);
        return;
      }

      if (!month) {
        setHuddleError("Missing month context.");
        return;
      }

      const nextMeeting = setMeetingRoomId({
        moaiId,
        month,
        roomId: result.roomId,
      });

      setMeeting(nextMeeting);
    } catch {
      setHuddleError("Unable to create room.");
    } finally {
      setHuddleLoading(false);
    }
  };

  const onGetToken = async () => {
    if (!roomId) return;
    setAutoJoin(false);
    setHuddleError(null);
    setHuddleLoading(true);
    setToken(null);
    try {
      if (!memberActive) {
        setHuddleError("Only members can generate tokens.");
        return;
      }
      const result = await getHuddleToken({
        roomId,
        address: voterId,
      });
      if (!result.ok) {
        setHuddleError(result.error);
        return;
      }
      setToken(result.token);
    } catch {
      setHuddleError("Unable to generate token.");
    } finally {
      setHuddleLoading(false);
    }
  };

  const onStartMeeting = async () => {
    setAutoJoin(true);
    setHuddleError(null);
    setHuddleLoading(true);
    setToken(null);

    try {
      if (!memberActive) {
        setHuddleError("Only members can start meetings.");
        setAutoJoin(false);
        return;
      }
      let ensuredRoomId = roomId;

      if (!ensuredRoomId) {
        const created = await createHuddleRoom({
          title: moaiName && month ? `${moaiName} · ${month}` : "Moai meeting",
        });

        if (!created.ok) {
          setHuddleError(created.error);
          setAutoJoin(false);
          return;
        }

        if (!month) {
          setHuddleError("Missing month context.");
          setAutoJoin(false);
          return;
        }

        const nextMeeting = setMeetingRoomId({
          moaiId,
          month,
          roomId: created.roomId,
        });

        setMeeting(nextMeeting);
        ensuredRoomId = created.roomId;
      }

      const tok = await getHuddleToken({
        roomId: ensuredRoomId,
        address: voterId,
      });
      if (!tok.ok) {
        setHuddleError(tok.error);
        setAutoJoin(false);
        return;
      }

      setToken(tok.token);
    } catch {
      setHuddleError("Unable to start meeting.");
      setAutoJoin(false);
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
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-neutral-900 px-5 py-3 text-base font-semibold text-white disabled:opacity-50"
            type="button"
            disabled={!canCheckIn}
            onClick={() => onCheckIn()}
          >
            Check in
          </button>
          <button
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-neutral-200 px-5 py-3 text-base font-medium text-neutral-900 hover:bg-neutral-50"
            type="button"
            onClick={() => {
              const ics = generateMeetingIcs({
                title: moaiName
                  ? `${moaiName} · Monthly meeting`
                  : "Moai meeting",
                scheduledAt: meeting.scheduledAt,
                durationMinutes: 60,
                joinUrl: roomId
                  ? `https://app.huddle01.com/${roomId}`
                  : undefined,
                description: "Monthly Moai check-in meeting via Huddle01.",
              });
              downloadIcs(`moai-${meeting.month}.ics`, ics);
            }}
          >
            Add to calendar
          </button>
        </div>

        {checkedInAt ? (
          <p className="mt-3 text-sm text-neutral-600">
            Checked in at {new Date(checkedInAt).toLocaleString(undefined)}.
          </p>
        ) : null}
        {receiptId ? (
          <p className="mt-1 text-sm text-neutral-600">
            Receipt:{" "}
            <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
              {receiptId.slice(0, 12)}…{receiptId.slice(-6)}
            </span>
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Huddle01</h2>
        <p className="mt-2 text-sm text-neutral-700">
          Room and access token are generated server-side.
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Joining the room will auto check-in for this month.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            disabled={huddleLoading}
            onClick={() => void onStartMeeting()}
          >
            {huddleLoading ? "Preparing…" : "Start meeting"}
          </button>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
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
          <HuddleJoinPanel
            roomId={roomId}
            token={token}
            autoJoin={autoJoin}
            onJoined={() => onCheckIn({ silent: true })}
          />
        ) : null}

        <p className="mt-3 text-sm text-neutral-600">
          Set <span className="font-mono text-xs">HUDDLE_API_KEY</span> in{" "}
          <span className="font-mono text-xs">.env</span> to enable.
        </p>
      </div>
    </div>
  );
}
