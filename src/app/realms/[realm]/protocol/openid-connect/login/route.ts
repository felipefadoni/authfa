import { NextResponse } from "next/server";
import { SSO_COOKIE, sessionCookieOptions } from "@/server/cookies";
import { authenticate, createSession, recordEvent } from "@/server/directory";
import { issueAuthorizationCode, OidcError, validateAuthorizeRequest } from "@/server/oidc";
import { signSessionToken } from "@/server/token-cookie";

export async function POST(request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm: realmName } = await context.params;
  const form = await request.formData();
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const scope = String(form.get("scope") ?? "openid");
  const state = String(form.get("state") ?? "");
  const nonce = String(form.get("nonce") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const codeChallengeMethod = String(form.get("code_challenge_method") ?? "");
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  const back = new URL(`/realms/${realmName}/protocol/openid-connect/auth`, request.url);
  for (const [key, value] of [
    ["client_id", clientId],
    ["redirect_uri", redirectUri],
    ["response_type", "code"],
    ["scope", scope],
    ["state", state],
    ["nonce", nonce],
    ["code_challenge", codeChallenge],
    ["code_challenge_method", codeChallengeMethod],
  ] as const) {
    if (value) back.searchParams.set(key, value);
  }

  try {
    await validateAuthorizeRequest({ realmName, clientId, redirectUri, responseType: "code" });
    const authenticated = await authenticate(realmName, username, password, ip);
    if (!authenticated) {
      back.searchParams.set("error", "invalid_grant");
      return NextResponse.redirect(back, 303);
    }
    await recordEvent({ realmId: authenticated.realm.id, type: "LOGIN", userId: authenticated.user.id, details: clientId, ip });
    const session = await createSession({
      userId: authenticated.user.id,
      realmId: authenticated.realm.id,
      ip,
      userAgent: request.headers.get("user-agent") ?? "",
    });
    const destination = await issueAuthorizationCode({
      realmName,
      clientId,
      redirectUri,
      scope,
      state,
      nonce,
      codeChallenge,
      codeChallengeMethod,
      user: authenticated.user,
      sessionId: session.id,
    });
    const token = await signSessionToken({
      sub: authenticated.user.id,
      sid: session.id,
      realmId: authenticated.realm.id,
      username: authenticated.user.username,
      name: authenticated.user.first_name,
    });
    const response = NextResponse.redirect(destination, 303);
    response.cookies.set(SSO_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof OidcError) {
      return NextResponse.json({ error: error.code, error_description: error.message }, { status: error.status });
    }
    throw error;
  }
}
