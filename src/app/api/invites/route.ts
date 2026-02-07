import { NextResponse } from "next/server";
import { generateInviteCode, invitePath } from "@/lib/invite";
import { putInvite } from "@/server/store";

type Body = {
  moaiId?: string;
  moaiName?: string;
  createdBy?: string;
  expiresInDays?: number;
};

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const moaiId = typeof body.moaiId === "string" ? body.moaiId.trim() : "";
  const moaiName =
    typeof body.moaiName === "string" ? body.moaiName.trim() : "";
  const createdBy =
    typeof body.createdBy === "string" ? body.createdBy.trim() : undefined;

  if (!moaiId.length || !moaiName.length) {
    return NextResponse.json(
      { error: "moaiId and moaiName are required" },
      { status: 400 },
    );
  }

  const expiresInDaysRaw =
    typeof body.expiresInDays === "number" ? body.expiresInDays : 7;
  const expiresInDays = Math.min(30, Math.max(1, Math.floor(expiresInDaysRaw)));

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const code = generateInviteCode();
  const origin = new URL(req.url).origin;
  const url = `${origin}${invitePath(code)}`;

  putInvite({
    code,
    moaiId,
    moaiName,
    createdBy,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  return NextResponse.json({ code, url, expiresAt: expiresAt.toISOString() });
}
