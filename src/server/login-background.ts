import "server-only";

import fs from "node:fs";
import path from "node:path";

const DIRECTORY = path.join(process.cwd(), "data", "login-backgrounds");
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function saveLoginAsset(realmId: string, kind: "background" | "icon", bytes: Buffer, mime: string) {
  const extension = TYPES[mime];
  if (!extension) throw new Error("Formato de imagem não suportado.");
  fs.mkdirSync(DIRECTORY, { recursive: true });
  const prefix = kind === "icon" ? `${realmId}-icon` : realmId;
  for (const current of Object.values(TYPES)) {
    const file = path.join(DIRECTORY, `${prefix}.${current}`);
    if (current !== extension && fs.existsSync(file)) fs.unlinkSync(file);
  }
  fs.writeFileSync(path.join(DIRECTORY, `${prefix}.${extension}`), bytes);
}

export function readLoginAsset(realmId: string, kind: "background" | "icon") {
  const prefix = kind === "icon" ? `${realmId}-icon` : realmId;
  for (const [mime, extension] of Object.entries(TYPES)) {
    const file = path.join(DIRECTORY, `${prefix}.${extension}`);
    if (!fs.existsSync(file)) continue;
    return { bytes: fs.readFileSync(file), mime };
  }
  return null;
}

export async function saveLoginBackground(realmId: string, bytes: Buffer, mime: string) {
  await saveLoginAsset(realmId, "background", bytes, mime);
}

export function readLoginBackground(realmId: string) {
  return readLoginAsset(realmId, "background");
}
