import { AccessToken, Role } from "@huddle01/server-sdk/auth";
import { NextResponse } from "next/server";

type Body = {
  role?: string;
};

function parseRole(value: string | null | undefined): Role {
  const v = value?.trim().toLowerCase();
  if (v === "host") return Role.HOST;
  if (v === "cohost" || v === "co_host") return Role.CO_HOST;
  if (v === "speaker") return Role.SPEAKER;
  if (v === "listener") return Role.LISTENER;
  if (v === "bot") return Role.BOT;
  return Role.GUEST;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.HUDDLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HUDDLE_API_KEY" },
      { status: 500 },
    );
  }

  const { id } = await params;
  const roomId = id.trim();
  if (!roomId.length) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const role = parseRole(body.role);

  const accessToken = new AccessToken({
    apiKey,
    roomId,
    role,
    permissions: {
      admin: role === Role.HOST || role === Role.CO_HOST,
      canConsume: true,
      canProduce: true,
      canProduceSources: {
        cam: true,
        mic: true,
        screen: true,
      },
      canRecvData: true,
      canSendData: true,
      canUpdateMetadata: true,
    },
  });

  const token = await accessToken.toJwt();
  return NextResponse.json({ token });
}
