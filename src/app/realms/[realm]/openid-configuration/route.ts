import { NextResponse } from "next/server";
import { discovery, originFrom } from "@/server/oidc";

export async function GET(request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm } = await context.params;
  return NextResponse.json(discovery(originFrom(request), realm));
}
