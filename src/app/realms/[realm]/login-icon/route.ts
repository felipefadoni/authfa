import { NextResponse } from "next/server";
import { findRealmByName } from "@/server/directory";
import { readLoginAsset } from "@/server/login-background";

export async function GET(_request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm: realmName } = await context.params;
  const realm = await findRealmByName(realmName);
  if (!realm) return new NextResponse(null, { status: 404 });
  const image = readLoginAsset(realm.id, "icon");
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
