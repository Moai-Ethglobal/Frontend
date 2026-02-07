import { NextResponse } from "next/server";
import { getInvite } from "@/server/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const trimmed = code.trim();
  if (!trimmed.length) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const invite = getInvite(trimmed);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const expired =
    Number.isFinite(Date.parse(invite.expiresAt)) &&
    Date.parse(invite.expiresAt) <= Date.now();
  if (expired) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  return NextResponse.json({
    moaiId: invite.moaiId,
    moaiName: invite.moaiName,
    createdBy: invite.createdBy,
    expiresAt: invite.expiresAt,
  });
}
