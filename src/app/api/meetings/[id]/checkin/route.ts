import { NextResponse } from "next/server";

type Body = {
  voterId?: string;
  moaiId?: string;
  month?: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meetingId = id.trim();
  if (!meetingId.length) {
    return NextResponse.json(
      { error: "meetingId is required" },
      { status: 400 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const voterId = typeof body.voterId === "string" ? body.voterId.trim() : "";
  if (!voterId.length) {
    return NextResponse.json({ error: "voterId is required" }, { status: 400 });
  }

  const receiptId =
    globalThis.crypto?.randomUUID?.() ??
    `rcpt:${Date.now()}:${meetingId}:${voterId}`;

  return NextResponse.json({
    receiptId,
    checkedInAt: new Date().toISOString(),
    meetingId,
    moaiId: typeof body.moaiId === "string" ? body.moaiId.trim() : undefined,
    month: typeof body.month === "string" ? body.month.trim() : undefined,
  });
}
