"use client";

import { HuddleClient, HuddleProvider } from "@huddle01/react";
import { useRoom } from "@huddle01/react/hooks";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  roomId: string;
  token: string;
  autoJoin?: boolean;
  onJoined?: () => void;
  onLeft?: () => void;
};

function JoinControls({ roomId, token, autoJoin, onJoined, onLeft }: Props) {
  const [error, setError] = useState<string | null>(null);
  const lastAutoJoinKey = useRef<string | null>(null);

  const { state, joinRoom, leaveRoom } = useRoom({
    onJoin: () => {
      setError(null);
      onJoined?.();
    },
    onFailed: (data) => {
      setError(data.message);
    },
    onLeave: () => {
      setError(null);
      onLeft?.();
    },
  });

  const canJoin = state === "idle" || state === "left" || state === "failed";
  const canLeave = state === "connected" || state === "connecting";

  const onJoin = async () => {
    setError(null);
    try {
      await joinRoom({ roomId, token });
    } catch {
      setError("Unable to join room.");
    }
  };

  useEffect(() => {
    if (!autoJoin) return;
    if (!canJoin) return;
    const key = `${roomId}:${token}`;
    if (lastAutoJoinKey.current === key) return;
    lastAutoJoinKey.current = key;
    setError(null);
    joinRoom({ roomId, token }).catch(() => {
      setError("Unable to join room.");
    });
  }, [autoJoin, canJoin, joinRoom, roomId, token]);

  return (
    <div className="mt-4">
      <p className="text-sm text-neutral-700">
        Room state:{" "}
        <span className="font-medium text-neutral-900">{state}</span>
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={!canJoin}
          onClick={() => void onJoin()}
        >
          Join meeting
        </button>
        <button
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
          type="button"
          disabled={!canLeave}
          onClick={leaveRoom}
        >
          Leave
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export default function HuddleJoinPanel({
  roomId,
  token,
  autoJoin,
  onJoined,
  onLeft,
}: Props) {
  const projectId = process.env.NEXT_PUBLIC_HUDDLE_PROJECT_ID;

  const client = useMemo(() => {
    if (!projectId) return null;
    return new HuddleClient({
      projectId,
      options: {
        activeSpeakers: { size: 12 },
      },
    });
  }, [projectId]);

  if (!projectId || !client) {
    return (
      <p className="mt-3 text-sm text-neutral-600">
        Missing{" "}
        <span className="font-mono text-xs">NEXT_PUBLIC_HUDDLE_PROJECT_ID</span>
        .
      </p>
    );
  }

  return (
    <HuddleProvider client={client}>
      <JoinControls
        roomId={roomId}
        token={token}
        autoJoin={autoJoin}
        onJoined={onJoined}
        onLeft={onLeft}
      />
    </HuddleProvider>
  );
}
