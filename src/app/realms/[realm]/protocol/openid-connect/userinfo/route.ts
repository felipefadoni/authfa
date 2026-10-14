import { NextResponse } from "next/server";
import { corsHeaders, issuerFor, OidcError, originFrom, userInfo } from "@/server/oidc";

export async function OPTIONS(request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm } = await context.params;
  return new NextResponse(null, { status: 204, headers: await corsHeaders(request, realm) });
}

export async function GET(request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm } = await context.params;
  const headers = await corsHeaders(request, realm);
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const info = await userInfo(realm, token, issuerFor(originFrom(request), realm));
    return NextResponse.json(info, { headers });
  } catch (error) {
    if (error instanceof OidcError) {
      return NextResponse.json(
        { error: error.code, error_description: error.message },
        { status: error.status, headers: { ...headers, "WWW-Authenticate": "Bearer" } },
      );
    }
    throw error;
  }
}
