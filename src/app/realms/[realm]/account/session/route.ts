import { NextResponse } from "next/server";
import { SSO_COOKIE, sessionCookieOptions } from "@/server/cookies";
import { authenticate, createSession } from "@/server/directory";
import { signSessionToken } from "@/server/token-cookie";

export async function POST(request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm } = await context.params;
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const authenticated = await authenticate(realm, username, password, ip);
  if (!authenticated) {
    return NextResponse.redirect(new URL(`/realms/${realm}/account?error=1`, request.url), 303);
  }

  const session = await createSession({
    userId: authenticated.user.id,
    realmId: authenticated.realm.id,
    ip,
    userAgent: request.headers.get("user-agent") ?? "",
  });
  const token = await signSessionToken({
    sub: authenticated.user.id,
    sid: session.id,
    realmId: authenticated.realm.id,
    username: authenticated.user.username,
    name: authenticated.user.first_name,
  });
  const response = NextResponse.redirect(new URL(`/realms/${realm}/account`, request.url), 303);
  response.cookies.set(SSO_COOKIE, token, sessionCookieOptions);
  return response;
}
