import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { exportJWK, importPKCS8, importSPKI, SignJWT, jwtVerify } from "jose";
import { getDb } from "@/server/db";
import {
  activeSession,
  findRealmByName,
  getClientByClientId,
  getUserById,
  parseJsonList,
  userRoles,
  type ClientRecord,
  type RealmRecord,
  type UserRecord,
} from "@/server/directory";
import { safeEqual } from "@/server/passwords";
import { ready } from "@/server/schema";

const CODE_TTL_MS = 2 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class OidcError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type AuthorizeInput = {
  realmName: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  user: UserRecord;
  sessionId: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function realmAndClient(realmName: string, clientId: string) {
  await ready();
  const realm = await findRealmByName(realmName);
  if (!realm) throw new OidcError("invalid_request", 400, "Realm não encontrado.");
  const client = await getClientByClientId(realm.id, clientId);
  if (!client || !client.enabled) throw new OidcError("invalid_client", 401, "Cliente inválido.");
  return { realm, client };
}

function assertRedirect(client: ClientRecord, redirectUri: string) {
  const allowed = parseJsonList(client.redirect_uris);
  if (!redirectUri || !allowed.includes(redirectUri)) {
    throw new OidcError("invalid_request", 400, "redirect_uri não está autorizado para este cliente.");
  }
}

export function authorizationErrorRedirect(redirectUri: string, state: string, error: string, description: string) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return url;
}

export async function validateAuthorizeRequest(input: {
  realmName: string;
  clientId: string;
  redirectUri: string;
  responseType: string;
}) {
  const { realm, client } = await realmAndClient(input.realmName, input.clientId);
  assertRedirect(client, input.redirectUri);
  if (input.responseType !== "code") {
    throw new OidcError("unsupported_response_type", 400, "Só o fluxo authorization code está disponível.");
  }
  if (!client.standard_flow) {
    throw new OidcError("unauthorized_client", 400, "O standard flow está desligado neste cliente.");
  }
  return { realm, client };
}

export async function issueAuthorizationCode(input: AuthorizeInput) {
  const { realm, client } = await realmAndClient(input.realmName, input.clientId);
  assertRedirect(client, input.redirectUri);
  const code = randomBytes(32).toString("base64url");
  await getDb()("auth_codes").insert({
    code,
    realm_id: realm.id,
    client_id: client.id,
    user_id: input.user.id,
    session_id: input.sessionId,
    redirect_uri: input.redirectUri,
    scope: input.scope || "openid",
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    used_at: null,
  });

  const url = new URL(input.redirectUri);
  url.searchParams.set("code", code);
  if (input.state) url.searchParams.set("state", input.state);
  return url;
}

function verifyPkce(challenge: string, method: string, verifier: string) {
  if (!challenge) return;
  if (!verifier) throw new OidcError("invalid_grant", 400, "code_verifier é obrigatório.");
  const actual = method === "S256" ? createHash("sha256").update(verifier).digest("base64url") : verifier;
  if (!safeEqual(actual, challenge)) {
    throw new OidcError("invalid_grant", 400, "code_verifier não confere.");
  }
}

async function signToken(realm: RealmRecord, payload: Record<string, unknown>, ttlSeconds: number, issuer: string, audience: string, subject: string) {
  const key = await importPKCS8(realm.private_key, "RS256");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: realm.id, typ: "JWT" })
    .setIssuer(issuer)
    .setSubject(subject)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key);
}

async function tokenResponse(input: {
  realm: RealmRecord;
  client: ClientRecord;
  user: UserRecord;
  sessionId: string;
  scope: string;
  nonce: string;
  issuer: string;
}) {
  const roles = await userRoles(input.user.id);
  const scope = input.scope || "openid";
  const profile = scope.includes("profile");
  const email = scope.includes("email");
  const shared = {
    azp: input.client.client_id,
    scope,
    sid: input.sessionId,
    realm_access: { roles },
    ...(profile
      ? {
          name: `${input.user.first_name} ${input.user.last_name}`.trim(),
          given_name: input.user.first_name,
          family_name: input.user.last_name,
          preferred_username: input.user.username,
        }
      : {}),
    ...(email ? { email: input.user.email, email_verified: Boolean(input.user.email_verified) } : {}),
  };

  const accessToken = await signToken(
    input.realm,
    { ...shared, typ: "Bearer" },
    input.realm.access_token_ttl,
    input.issuer,
    input.client.client_id,
    input.user.id,
  );
  const idToken = await signToken(
    input.realm,
    { ...shared, typ: "ID", ...(input.nonce ? { nonce: input.nonce } : {}) },
    input.realm.access_token_ttl,
    input.issuer,
    input.client.client_id,
    input.user.id,
  );

  const refreshToken = randomBytes(32).toString("base64url");
  const now = new Date();
  await getDb()("refresh_tokens").insert({
    id: crypto.randomUUID(),
    token_hash: hashToken(refreshToken),
    user_id: input.user.id,
    client_id: input.client.id,
    realm_id: input.realm.id,
    session_id: input.sessionId,
    expires_at: new Date(now.getTime() + REFRESH_TTL_MS).toISOString(),
    revoked_at: null,
    created_at: now.toISOString(),
  });

  return {
    access_token: accessToken,
    expires_in: input.realm.access_token_ttl,
    refresh_expires_in: Math.floor(REFRESH_TTL_MS / 1000),
    refresh_token: refreshToken,
    token_type: "Bearer",
    id_token: idToken,
    scope,
    session_state: input.sessionId,
  };
}

function assertClientSecret(client: ClientRecord, secret: string) {
  if (client.public_client) return;
  if (!secret || !client.secret || !safeEqual(secret, client.secret)) {
    throw new OidcError("invalid_client", 401, "Segredo do cliente inválido.");
  }
}

export async function exchangeAuthorizationCode(input: {
  realmName: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  issuer: string;
}) {
  await ready();
  const { realm, client } = await realmAndClient(input.realmName, input.clientId);
  assertClientSecret(client, input.clientSecret);
  const database = getDb();

  const consumed = await database.transaction(async (trx) => {
    const updated = await trx("auth_codes")
      .where({ code: input.code, realm_id: realm.id, client_id: client.id })
      .whereNull("used_at")
      .andWhere("expires_at", ">", new Date().toISOString())
      .update({ used_at: new Date().toISOString() });
    if (!updated) return null;
    return trx("auth_codes").where({ code: input.code }).first<{
      redirect_uri: string;
      scope: string;
      nonce: string;
      code_challenge: string;
      code_challenge_method: string;
      user_id: string;
      session_id: string;
    }>();
  });

  if (!consumed || consumed.redirect_uri !== input.redirectUri) {
    throw new OidcError("invalid_grant", 400, "Authorization code inválido.");
  }
  verifyPkce(consumed.code_challenge, consumed.code_challenge_method || "plain", input.codeVerifier);
  const session = await activeSession(consumed.session_id);
  const user = await getUserById(consumed.user_id);
  if (!session || !user || !user.enabled) {
    throw new OidcError("invalid_grant", 400, "A sessão do login não está mais ativa.");
  }

  return tokenResponse({
    realm,
    client,
    user,
    sessionId: consumed.session_id,
    scope: consumed.scope,
    nonce: consumed.nonce,
    issuer: input.issuer,
  });
}

export async function refreshAccessToken(input: {
  realmName: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  issuer: string;
}) {
  await ready();
  const { realm, client } = await realmAndClient(input.realmName, input.clientId);
  assertClientSecret(client, input.clientSecret);
  const database = getDb();
  const tokenHash = hashToken(input.refreshToken);

  const current = await database.transaction(async (trx) => {
    const row = await trx("refresh_tokens")
      .where({ token_hash: tokenHash, realm_id: realm.id, client_id: client.id })
      .whereNull("revoked_at")
      .andWhere("expires_at", ">", new Date().toISOString())
      .first<{ id: string; user_id: string; session_id: string }>();
    if (!row) return null;
    await trx("refresh_tokens").where({ id: row.id }).update({ revoked_at: new Date().toISOString() });
    return row;
  });

  if (!current) throw new OidcError("invalid_grant", 400, "Refresh token inválido.");
  const session = await activeSession(current.session_id);
  const user = await getUserById(current.user_id);
  if (!session || !user || !user.enabled) {
    throw new OidcError("invalid_grant", 400, "A sessão não está mais ativa.");
  }

  return tokenResponse({
    realm,
    client,
    user,
    sessionId: current.session_id,
    scope: "openid profile email",
    nonce: "",
    issuer: input.issuer,
  });
}

export async function userInfo(realmName: string, accessToken: string, issuer: string) {
  await ready();
  const realm = await findRealmByName(realmName);
  if (!realm) throw new OidcError("invalid_token", 401, "Realm não encontrado.");
  const key = await importSPKI(realm.public_key, "RS256");
  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(accessToken, key, { issuer });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    throw new OidcError("invalid_token", 401, "Access token inválido.");
  }
  if (payload.typ !== "Bearer" || typeof payload.sid !== "string" || typeof payload.sub !== "string") {
    throw new OidcError("invalid_token", 401, "Access token inválido.");
  }
  const session = await activeSession(payload.sid);
  const user = await getUserById(payload.sub);
  if (!session || !user || !user.enabled) {
    throw new OidcError("invalid_token", 401, "A sessão não está mais ativa.");
  }
  const roles = await userRoles(user.id);
  return {
    sub: user.id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    given_name: user.first_name,
    family_name: user.last_name,
    preferred_username: user.username,
    email: user.email,
    email_verified: Boolean(user.email_verified),
    realm_access: { roles },
  };
}

export async function jwks(realmName: string) {
  await ready();
  const realm = await findRealmByName(realmName);
  if (!realm) throw new OidcError("invalid_request", 404, "Realm não encontrado.");
  const key = await importSPKI(realm.public_key, "RS256");
  const jwk = await exportJWK(key);
  return { keys: [{ ...jwk, use: "sig", alg: "RS256", kid: realm.id }] };
}

export function discovery(origin: string, realmName: string) {
  const issuer = `${origin}/realms/${realmName}`;
  const base = `${issuer}/protocol/openid-connect`;
  return {
    issuer,
    authorization_endpoint: `${base}/auth`,
    token_endpoint: `${base}/token`,
    userinfo_endpoint: `${base}/userinfo`,
    end_session_endpoint: `${base}/logout`,
    jwks_uri: `${base}/certs`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
    code_challenge_methods_supported: ["S256", "plain"],
  };
}

export function issuerFor(origin: string, realmName: string) {
  return `${origin}/realms/${realmName}`;
}

export async function previewCode(code: string) {
  await ready();
  return getDb()("auth_codes")
    .join("clients", "clients.id", "auth_codes.client_id")
    .where("auth_codes.code", code)
    .select("clients.client_id", "clients.secret", "clients.public_client", "auth_codes.redirect_uri", "auth_codes.used_at")
    .first<{ client_id: string; secret: string | null; public_client: number; redirect_uri: string; used_at: string | null }>();
}

export function originFrom(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto ?? "http"}://${forwardedHost}`;
  return url.origin;
}

export async function corsHeaders(request: Request, realmName: string): Promise<Record<string, string>> {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  await ready();
  const realm = await findRealmByName(realmName);
  if (!realm) return {};
  const clients = await getDb()("clients").where({ realm_id: realm.id }).select("web_origins");
  const allowed = clients.some((client: { web_origins: string }) => parseJsonList(client.web_origins).includes(origin));
  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}

export async function allowedLogoutRedirect(realmName: string, redirectUri: string) {
  await ready();
  const realm = await findRealmByName(realmName);
  if (!realm || !redirectUri) return false;
  const clients = await getDb()("clients").where({ realm_id: realm.id }).select("redirect_uris");
  return clients.some((client: { redirect_uris: string }) => parseJsonList(client.redirect_uris).includes(redirectUri));
}
