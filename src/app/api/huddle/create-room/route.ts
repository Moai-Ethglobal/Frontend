import { NextResponse } from "next/server";

type Body = {
  title?: string;
  roomLocked?: boolean;
  metadata?: Record<string, unknown>;
};

export async function POST(req: Request) {
  const apiKey = process.env.HUDDLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HUDDLE_API_KEY" },
      { status: 500 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : "Moai meeting";

  const metadata: Record<string, unknown> =
    body.metadata && typeof body.metadata === "object"
      ? { ...body.metadata }
      : {};
  metadata.title ??= title;

  const roomLocked = Boolean(body.roomLocked);

  const res = await fetch(
    "https://api.huddle01.com/api/v2/sdk/rooms/create-room",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        roomLocked,
        metadata,
      }),
    },
  );

  const json = (await res.json().catch(() => null)) as {
    message?: unknown;
    data?: unknown;
  } | null;

  if (!res.ok) {
    return NextResponse.json(
      {
        error: "Huddle create-room failed",
        status: res.status,
        details: json,
      },
      { status: 502 },
    );
  }

  const roomId = (json?.data as { roomId?: unknown } | undefined)?.roomId;
  if (typeof roomId !== "string" || roomId.trim().length === 0) {
    return NextResponse.json(
      { error: "Unexpected Huddle response", details: json },
      { status: 502 },
    );
  }

  return NextResponse.json({
    roomId: roomId.trim(),
    message: typeof json?.message === "string" ? json.message : undefined,
  });
}
