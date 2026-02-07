import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { putFile } from "@/server/store";

const MAX_BYTES = 1_500_000;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const f = file as File;
  if (f.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large" }, { status: 413 });
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await f.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "Unable to read file" }, { status: 400 });
  }

  const hash = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  const id = `sha256:${hash}`;
  const now = new Date().toISOString();

  putFile({
    id,
    name: f.name,
    mime: f.type || "application/octet-stream",
    size: f.size,
    sha256: hash,
    createdAt: now,
  });

  return NextResponse.json({
    uri: `local://${id}`,
    hash,
    name: f.name,
    mime: f.type || "application/octet-stream",
    size: f.size,
    uploadedAt: now,
  });
}
