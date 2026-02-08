import { NextResponse } from "next/server";
import { isEvmAddress } from "@/lib/evm";
import { putNonce } from "@/server/store";

type Body = {
  address?: string;
  roomId?: string;
};

function gatingEnabled(): boolean {
  return Boolean(process.env.MOAI_CONTRACT_ADDRESS);
}

function buildMessage(input: {
  address: string;
  roomId: string;
  nonce: string;
  issuedAt: string;
}): string {
  const chainId = process.env.MOAI_CHAIN_ID?.trim();
  const moai = process.env.MOAI_CONTRACT_ADDRESS?.trim();
  return [
    "Moai meeting token request",
    `Address: ${input.address}`,
    moai ? `Moai: ${moai}` : null,
    `Room: ${input.roomId}`,
    chainId ? `ChainId: ${chainId}` : null,
    `Nonce: ${input.nonce}`,
    `IssuedAt: ${input.issuedAt}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  if (!gatingEnabled()) {
    return NextResponse.json(
      { error: "Meeting gating is disabled" },
      { status: 409 },
    );
  }

  const rpcUrl = process.env.MOAI_RPC_URL?.trim() ?? "";
  const moai = process.env.MOAI_CONTRACT_ADDRESS?.trim() ?? "";
  if (!rpcUrl.length || !isEvmAddress(moai)) {
    return NextResponse.json(
      { error: "Meeting gating is misconfigured" },
      { status: 500 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";

  if (!isEvmAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  if (!roomId.length) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const nonce =
    globalThis.crypto?.randomUUID?.() ?? `nonce:${Date.now()}:${address}`;

  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const message = buildMessage({ address, roomId, nonce, issuedAt });

  putNonce({
    nonce,
    address,
    roomId,
    message,
    issuedAt,
    expiresAt,
    used: false,
  });

  return NextResponse.json({ nonce, message, issuedAt, expiresAt });
}
