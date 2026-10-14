import { NextResponse } from "next/server";
import { SSO_COOKIE } from "@/server/cookies";
import { allowedLogoutRedirect, originFrom } from "@/server/oidc";

export async function GET(request: Request, context: { params: Promise<{ realm: string }> }) {
  const { realm } = await context.params;
  const url = new URL(request.url);
  const requested = url.searchParams.get("post_logout_redirect_uri") ?? "";
  const origin = originFrom(request);
  const account = new URL(`/realms/${realm}/account`, origin).toString();
  const allowed = requested === account || (await allowedLogoutRedirect(realm, requested));
  const response = NextResponse.redirect(allowed ? requested : account, 303);
  response.cookies.delete(SSO_COOKIE);
  return response;
}
