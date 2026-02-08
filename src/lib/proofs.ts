import { readJson, writeJson } from "./storage";

export type ProofRef = {
  id: string;
  uri?: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
  uploadedAt: string;
};

export type Proof = ProofRef & {
  dataUrl?: string;
};

const STORAGE_KEY = "moai.proofs.v1";

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `proof:${Date.now()}`;
}

function readAll(): Proof[] {
  return readJson<Proof[]>(STORAGE_KEY) ?? [];
}

function writeAll(value: Proof[]): void {
  writeJson(STORAGE_KEY, value);
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

async function sha256Hex(data: ArrayBuffer): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  try {
    const digest = await subtle.digest("SHA-256", data);
    return toHex(digest);
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") reject(new Error("Invalid data URL"));
      else resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

export function toProofRef(proof: Proof): ProofRef {
  const { id, uri, name, mime, size, sha256, uploadedAt } = proof;
  return { id, uri, name, mime, size, sha256, uploadedAt };
}

export function getProofById(id: string): Proof | null {
  return readAll().find((p) => p.id === id) ?? null;
}

export async function uploadProof(input: {
  file: File;
  maxBytes?: number;
  maxBytesForDataUrl?: number;
}): Promise<{ ok: true; proof: Proof } | { ok: false; error: string }> {
  const maxBytes = Math.max(1, input.maxBytes ?? 1_500_000);
  const maxBytesForDataUrl = Math.max(0, input.maxBytesForDataUrl ?? 250_000);

  const file = input.file;
  if (!file) return { ok: false, error: "Missing file." };
  if (file.size > maxBytes) return { ok: false, error: "File is too large." };

  let data: ArrayBuffer;
  try {
    data = await file.arrayBuffer();
  } catch {
    return { ok: false, error: "Unable to read file." };
  }

  const sha256 = await sha256Hex(data);
  if (!sha256) return { ok: false, error: "Crypto not available." };

  let uri: string | undefined;
  let uploadedAt: string | undefined;
  try {
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/files", { method: "POST", body: form });
    if (!res.ok) return { ok: false, error: "Upload failed." };
    const json = (await res.json().catch(() => null)) as {
      uri?: unknown;
      hash?: unknown;
      uploadedAt?: unknown;
    } | null;
    const serverHash = typeof json?.hash === "string" ? json.hash.trim() : "";
    if (!serverHash.length) return { ok: false, error: "Upload failed." };
    if (serverHash.toLowerCase() !== sha256.toLowerCase()) {
      return { ok: false, error: "Upload failed." };
    }
    const serverUri = typeof json?.uri === "string" ? json.uri.trim() : "";
    if (serverUri.length) uri = serverUri;
    const serverUploadedAt =
      typeof json?.uploadedAt === "string" ? json.uploadedAt.trim() : "";
    if (serverUploadedAt.length) uploadedAt = serverUploadedAt;
  } catch {
    return { ok: false, error: "Upload failed." };
  }

  let dataUrl: string | undefined;
  if (file.size <= maxBytesForDataUrl) {
    try {
      dataUrl = await fileToDataUrl(file);
    } catch {
      dataUrl = undefined;
    }
  }

  const proof: Proof = {
    id: makeId(),
    uri,
    name: file.name.trim().length ? file.name.trim() : "proof",
    mime: file.type.trim().length
      ? file.type.trim()
      : "application/octet-stream",
    size: file.size,
    sha256,
    uploadedAt: uploadedAt ?? new Date().toISOString(),
    dataUrl,
  };

  writeAll([proof, ...readAll()]);
  return { ok: true, proof };
}
