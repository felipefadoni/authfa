import { NextResponse, type NextRequest } from "next/server";
import { CONSOLE_COOKIE } from "@/server/cookies";
import { readSessionToken } from "@/server/token-cookie";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(CONSOLE_COOKIE)?.value;
  if (!token) return redirectLogin(request);

  try {
    await readSessionToken(token);
    return NextResponse.next();
  } catch {
    const response = redirectLogin(request);
    response.cookies.delete(CONSOLE_COOKIE);
    return response;
  }
}

function redirectLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname;
  url.pathname = "/login";
  url.search = "";
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|realms|login|callback).*)"],
};
