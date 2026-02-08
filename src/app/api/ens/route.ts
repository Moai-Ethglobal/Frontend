import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { isEvmAddress } from "@/lib/evm";

const DEFAULT_MAINNET_RPC = "https://cloudflare-eth.com";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addressRaw = url.searchParams.get("address")?.trim();

  if (!addressRaw) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  if (!isEvmAddress(addressRaw)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const rpcUrl =
    process.env.ENS_RPC_URL ??
    process.env.MAINNET_RPC_URL ??
    DEFAULT_MAINNET_RPC;

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });

  try {
    const name = await publicClient.getEnsName({
      address: addressRaw as `0x${string}`,
    });

    if (!name) return NextResponse.json({ name: null, avatar: null });

    const normalized = normalize(name);
    const avatar = await publicClient
      .getEnsAvatar({ name: normalized })
      .catch(() => null);

    return NextResponse.json({ name, avatar });
  } catch {
    return NextResponse.json({ name: null, avatar: null }, { status: 200 });
  }
}
