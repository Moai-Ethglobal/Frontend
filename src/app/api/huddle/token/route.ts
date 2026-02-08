import { AccessToken, Role } from "@huddle01/server-sdk/auth";
import { NextResponse } from "next/server";
import type { Address } from "viem";
import { createPublicClient, http } from "viem";
import { MOAI_ABI } from "@/contracts/abi";
import { isEvmAddress } from "@/lib/evm";
import { getNonce, markNonceUsed } from "@/server/store";

function parseRole(value: string | null): Role {
  const v = value?.trim().toLowerCase();
  if (v === "host") return Role.HOST;
  if (v === "cohost" || v === "co_host") return Role.CO_HOST;
  if (v === "speaker") return Role.SPEAKER;
  if (v === "listener") return Role.LISTENER;
  if (v === "bot") return Role.BOT;
  return Role.GUEST;
}

function gatingEnabled(): boolean {
  return Boolean(process.env.MOAI_CONTRACT_ADDRESS);
}

export async function GET(req: Request) {
  if (gatingEnabled()) {
    return NextResponse.json(
      { error: "Use POST for gated tokens" },
      { status: 405 },
    );
  }

  const apiKey = process.env.HUDDLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HUDDLE_API_KEY" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId")?.trim();
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const role = parseRole(url.searchParams.get("role"));

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

type Body = {
  roomId?: string;
  role?: string;
  address?: string;
  nonce?: string;
  signature?: string;
};

export async function POST(req: Request) {
  if (!gatingEnabled()) {
    return NextResponse.json(
      { error: "Meeting gating is disabled" },
      { status: 409 },
    );
  }

  const apiKey = process.env.HUDDLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HUDDLE_API_KEY" },
      { status: 500 },
    );
  }

  const rpcUrl = process.env.MOAI_RPC_URL?.trim() ?? "";
  const moaiAddressRaw = process.env.MOAI_CONTRACT_ADDRESS?.trim() ?? "";
  if (!rpcUrl.length || !isEvmAddress(moaiAddressRaw)) {
    return NextResponse.json(
      { error: "Missing MOAI_RPC_URL or MOAI_CONTRACT_ADDRESS" },
      { status: 500 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
  if (!roomId.length) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!isEvmAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const nonce = typeof body.nonce === "string" ? body.nonce.trim() : "";
  if (!nonce.length) {
    return NextResponse.json({ error: "nonce is required" }, { status: 400 });
  }

  const signature =
    typeof body.signature === "string" ? body.signature.trim() : "";
  if (!signature.startsWith("0x") || signature.length < 10) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const record = getNonce(nonce);
  if (!record || record.used) {
    return NextResponse.json(
      { error: "invalid or used nonce" },
      { status: 400 },
    );
  }

  const expired =
    Number.isFinite(Date.parse(record.expiresAt)) &&
    Date.parse(record.expiresAt) <= Date.now();
  if (expired) {
    return NextResponse.json({ error: "nonce expired" }, { status: 410 });
  }

  if (record.address.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json(
      { error: "nonce address mismatch" },
      { status: 400 },
    );
  }

  if (record.roomId !== roomId) {
    return NextResponse.json({ error: "nonce room mismatch" }, { status: 400 });
  }

  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });

  let okSig = false;
  try {
    okSig = await publicClient.verifyMessage({
      address: address as Address,
      message: record.message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json(
      { error: "signature verification failed" },
      { status: 503 },
    );
  }

  if (!okSig) {
    return NextResponse.json({ error: "signature invalid" }, { status: 401 });
  }

  let rawMemberInfo: unknown = null;
  try {
    rawMemberInfo = await publicClient.readContract({
      address: moaiAddressRaw as Address,
      abi: MOAI_ABI,
      functionName: "memberInfo",
      args: [address as Address],
    });
  } catch {
    return NextResponse.json(
      { error: "membership check failed" },
      { status: 503 },
    );
  }
  const isActiveMember =
    rawMemberInfo != null &&
    (Array.isArray(rawMemberInfo)
      ? rawMemberInfo[0] === true
      : typeof rawMemberInfo === "object" &&
        (rawMemberInfo as Record<string, unknown>).isActive === true);

  if (!isActiveMember) {
    return NextResponse.json({ error: "not a member" }, { status: 403 });
  }

  markNonceUsed(nonce);

  const role = parseRole(body.role ?? null);

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
