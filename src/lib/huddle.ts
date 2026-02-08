import { getKernelAccountAddress, signAaMessage } from "./aa";
import { isEvmAddress } from "./evm";
import { signMessage } from "./wallet";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function createHuddleRoom(input: {
  title: string;
}): Promise<Ok<{ roomId: string }> | Err> {
  const title = input.title.trim();
  if (!title.length) return { ok: false, error: "Missing title." };

  try {
    const res = await fetch("/api/huddle/create-room", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const json = (await res.json().catch(() => null)) as unknown;
    const obj = asObject(json);
    const roomId = asString(obj?.roomId)?.trim();

    if (!res.ok) {
      const error = asString(obj?.error)?.trim();
      return {
        ok: false,
        error: error?.length ? error : "Unable to create room.",
      };
    }

    if (!roomId?.length) return { ok: false, error: "Missing roomId." };
    return { ok: true, roomId };
  } catch {
    return { ok: false, error: "Unable to create room." };
  }
}

async function tryGatedToken(input: {
  roomId: string;
  address: string;
  role?: string;
  sign: (message: string) => Promise<string | null>;
}): Promise<
  Ok<{ token: string }> | Err | { ok: false; error: "GATING_DISABLED" }
> {
  const res = await fetch("/api/huddle/nonce", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      roomId: input.roomId,
      address: input.address,
    }),
  });

  if (res.status === 409) return { ok: false, error: "GATING_DISABLED" };

  const json = (await res.json().catch(() => null)) as unknown;
  const obj = asObject(json);

  if (!res.ok) {
    const error = asString(obj?.error)?.trim();
    return {
      ok: false,
      error: error?.length ? error : "Unable to mint token.",
    };
  }

  const nonce = asString(obj?.nonce)?.trim();
  const message = asString(obj?.message)?.trim();
  const expiresAt = asString(obj?.expiresAt)?.trim();
  if (!nonce?.length || !message?.length) {
    return { ok: false, error: "Invalid nonce response." };
  }

  if (expiresAt?.length) {
    const exp = Date.parse(expiresAt);
    if (Number.isFinite(exp) && exp <= Date.now()) {
      return { ok: false, error: "Nonce expired. Try again." };
    }
  }

  const signature = await input.sign(message);
  if (!signature) return { ok: false, error: "Signature rejected." };

  const tokenRes = await fetch("/api/huddle/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      roomId: input.roomId,
      role: input.role,
      address: input.address,
      nonce,
      signature,
    }),
  });

  const tokenJson = (await tokenRes.json().catch(() => null)) as unknown;
  const tokenObj = asObject(tokenJson);
  const token = asString(tokenObj?.token)?.trim();

  if (!tokenRes.ok) {
    const error = asString(tokenObj?.error)?.trim();
    return {
      ok: false,
      error: error?.length ? error : "Unable to mint token.",
    };
  }

  if (!token?.length) return { ok: false, error: "Missing token." };
  return { ok: true, token };
}

export async function getHuddleToken(input: {
  roomId: string;
  address?: string | null;
  role?: string;
}): Promise<Ok<{ token: string }> | Err> {
  const roomId = input.roomId.trim();
  if (!roomId.length) return { ok: false, error: "Missing roomId." };

  try {
    const identity = input.address?.trim() ?? "";
    if (identity.length) {
      if (isEvmAddress(identity)) {
        const gated = await tryGatedToken({
          roomId,
          address: identity,
          role: input.role,
          sign: (message) => signMessage({ account: identity, message }),
        });
        if (gated.ok) return gated;
        if (gated.error !== "GATING_DISABLED") return gated;
      } else {
        const aa = await getKernelAccountAddress({ identityId: identity });
        if (aa && isEvmAddress(aa)) {
          const gated = await tryGatedToken({
            roomId,
            address: aa,
            role: input.role,
            sign: (message) => signAaMessage({ identityId: identity, message }),
          });
          if (gated.ok) return gated;
          if (gated.error !== "GATING_DISABLED") return gated;
        }
      }
    }

    const res = await fetch(
      `/api/huddle/token?roomId=${encodeURIComponent(roomId)}`,
    );

    const json = (await res.json().catch(() => null)) as unknown;
    const obj = asObject(json);
    const token = asString(obj?.token)?.trim();

    if (!res.ok) {
      const error = asString(obj?.error)?.trim();
      return {
        ok: false,
        error: error?.length ? error : "Unable to generate token.",
      };
    }

    if (!token?.length) return { ok: false, error: "Missing token." };
    return { ok: true, token };
  } catch {
    return { ok: false, error: "Unable to generate token." };
  }
}
