export const CONSOLE_COOKIE = "authfa_session";
export const SSO_COOKIE = "authfa_sso";
export const REALM_COOKIE = "authfa_realm";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
