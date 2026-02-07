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

export async function getHuddleToken(input: {
  roomId: string;
}): Promise<Ok<{ token: string }> | Err> {
  const roomId = input.roomId.trim();
  if (!roomId.length) return { ok: false, error: "Missing roomId." };

  try {
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
