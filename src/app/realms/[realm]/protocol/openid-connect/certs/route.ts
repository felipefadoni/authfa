import { NextResponse } from "next/server";
import { jwks, OidcError } from "@/server/oidc";

export async function GET(_request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm } = await context.params;
  try {
    return NextResponse.json(await jwks(realm));
  } catch (error) {
    if (error instanceof OidcError) {
      return NextResponse.json({ error: error.code, error_description: error.message }, { status: error.status });
    }
    throw error;
  }
}
