import { jwtVerify, SignJWT } from "jose";
import { getSessionSecret } from "@/server/secret";

export type SessionClaims = {
  sub: string;
  sid: string;
  realmId: string;
  username: string;
  name: string;
};

function isSessionClaims(payload: Record<string, unknown>): payload is SessionClaims {
  return (
    typeof payload.sub === "string" &&
    typeof payload.sid === "string" &&
    typeof payload.realmId === "string" &&
    typeof payload.username === "string" &&
    typeof payload.name === "string"
  );
}

export async function signSessionToken(claims: SessionClaims) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSessionSecret());
}

export async function readSessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSessionSecret());
  const claims = payload as Record<string, unknown>;
  if (!isSessionClaims(claims)) {
    throw new Error("Sessão inválida.");
  }
  return claims;
}
