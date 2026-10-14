import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { SSO_COOKIE } from "@/server/cookies";
import { activeSession, getLoginThemeByName, getUserById } from "@/server/directory";
import { issueAuthorizationCode, OidcError, validateAuthorizeRequest } from "@/server/oidc";
import { readSessionToken } from "@/server/token-cookie";

export const metadata: Metadata = { title: "Entrar" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AuthorizePage({
  params,
  searchParams,
}: {
  params: Promise<{ realm: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { realm: realmName } = await params;
  const query = await searchParams;
  const clientId = one(query.client_id);
  const redirectUri = one(query.redirect_uri);
  const responseType = one(query.response_type) || "code";
  const scope = one(query.scope) || "openid";
  const state = one(query.state);
  const nonce = one(query.nonce);
  const codeChallenge = one(query.code_challenge);
  const codeChallengeMethod = one(query.code_challenge_method);
  const error = one(query.error);
  const { theme } = await getLoginThemeByName(realmName);
  const title = theme.title || `Entrar em ${realmName}`;
  const subtitle = theme.subtitle;
  const buttonLabel = theme.buttonLabel || "Continuar";
  const usernameLabel = theme.usernameLabel || "Usuário";
  const passwordLabel = theme.passwordLabel || "Senha";

  let clientName = clientId;
  let realmId = "";
  try {
    const validated = await validateAuthorizeRequest({ realmName, clientId, redirectUri, responseType });
    clientName = validated.client.name;
    realmId = validated.realm.id;
  } catch (validationError) {
    if (validationError instanceof OidcError) {
      return (
        <AuthCard title={theme.title || "Login recusado"} lede={validationError.message} theme={theme}>
          <a className="btn btn-primary" href="/">
            Voltar
          </a>
        </AuthCard>
      );
    }
    throw validationError;
  }

  const headerStore = await headers();
  const prefetch = headerStore.get("next-router-prefetch") === "1" || headerStore.get("purpose") === "prefetch";
  const token = (await cookies()).get(SSO_COOKIE)?.value;
  if (token && !prefetch) {
    try {
      const claims = await readSessionToken(token);
      const session = await activeSession(claims.sid);
      const user = await getUserById(claims.sub);
      if (session && user && user.enabled && user.realm_id === realmId) {
        const destination = await issueAuthorizationCode({
          realmName,
          clientId,
          redirectUri,
          scope,
          state,
          nonce,
          codeChallenge,
          codeChallengeMethod,
          user,
          sessionId: session.id,
        });
        redirect(destination.toString());
      }
    } catch (ssoError) {
      const digest = typeof ssoError === "object" && ssoError && "digest" in ssoError ? String(ssoError.digest) : "";
      if (digest.startsWith("NEXT_REDIRECT")) throw ssoError;
    }
  }

  return (
    <AuthCard title={title} lede={subtitle || `A aplicação ${clientName} pediu acesso à sua conta.`} theme={theme}>
      {error ? (
        <p className="form-error" role="alert">
          Usuário ou senha inválidos.
        </p>
      ) : null}
      <form className="panel" style={{ padding: 0, border: 0, boxShadow: "none", background: "transparent" }} action={`/realms/${realmName}/protocol/openid-connect/login`} method="post">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="response_type" value={responseType} />
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="state" value={state} />
        <input type="hidden" name="nonce" value={nonce} />
        <input type="hidden" name="code_challenge" value={codeChallenge} />
        <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />
        <label className="field">
          <span>{usernameLabel}</span>
          <input name="username" autoComplete="username" required />
        </label>
        <label className="field">
          <span>{passwordLabel}</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn btn-primary" type="submit">
          {buttonLabel}
        </button>
      </form>
    </AuthCard>
  );
}
