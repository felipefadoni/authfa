import { NextResponse } from "next/server";
import { corsHeaders, exchangeAuthorizationCode, issuerFor, OidcError, originFrom, refreshAccessToken } from "@/server/oidc";

function clientAuth(request: Request, form: FormData) {
  let clientId = String(form.get("client_id") ?? "");
  let clientSecret = String(form.get("client_secret") ?? "");
  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator >= 0) {
      clientId = decodeURIComponent(decoded.slice(0, separator));
      clientSecret = decodeURIComponent(decoded.slice(separator + 1));
    }
  }
  return { clientId, clientSecret };
}

export async function OPTIONS(request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm } = await context.params;
  return new NextResponse(null, { status: 204, headers: await corsHeaders(request, realm) });
}

export async function POST(request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm } = await context.params;
  const headers = await corsHeaders(request, realm);
  const form = await request.formData();
  const { clientId, clientSecret } = clientAuth(request, form);
  const issuer = issuerFor(originFrom(request), realm);

  try {
    const grant = String(form.get("grant_type") ?? "");
    if (grant === "authorization_code") {
      const tokens = await exchangeAuthorizationCode({
        realmName: realm,
        clientId,
        clientSecret,
        code: String(form.get("code") ?? ""),
        redirectUri: String(form.get("redirect_uri") ?? ""),
        codeVerifier: String(form.get("code_verifier") ?? ""),
        issuer,
      });
      return NextResponse.json(tokens, { headers });
    }
    if (grant === "refresh_token") {
      const tokens = await refreshAccessToken({
        realmName: realm,
        clientId,
        clientSecret,
        refreshToken: String(form.get("refresh_token") ?? ""),
        issuer,
      });
      return NextResponse.json(tokens, { headers });
    }
    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "Use authorization_code ou refresh_token." },
      { status: 400, headers },
    );
  } catch (error) {
    if (error instanceof OidcError) {
      return NextResponse.json({ error: error.code, error_description: error.message }, { status: error.status, headers });
    }
    throw error;
  }
}
