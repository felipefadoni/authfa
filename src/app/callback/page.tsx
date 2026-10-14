import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { exchangeAuthorizationCode, issuerFor, OidcError, previewCode, userInfo } from "@/server/oidc";

export const metadata: Metadata = { title: "Aplicação conectada" };

export default async function CallbackPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  const oauthError = typeof params.error === "string" ? params.error : "";
  if (oauthError) {
    return (
      <AuthCard title="Login cancelado" lede={typeof params.error_description === "string" ? params.error_description : oauthError}>
        <a className="btn btn-primary" href="/">
          Voltar ao console
        </a>
      </AuthCard>
    );
  }
  if (!code) {
    return (
      <AuthCard title="Falta o código" lede="Abra o teste a partir de um cliente do realm.">
        <a className="btn btn-primary" href="/clients">
          Ver clientes
        </a>
      </AuthCard>
    );
  }

  const preview = await previewCode(code);
  if (!preview || preview.client_id !== "customer-app" || !preview.secret) {
    return (
      <AuthCard title="Código recebido" lede="Troque este código no token endpoint do cliente que iniciou o login.">
        <p className="secret">{code}</p>
      </AuthCard>
    );
  }

  try {
    const origin = new URL(preview.redirect_uri).origin;
    const issuer = issuerFor(origin, "acme");
    const tokens = await exchangeAuthorizationCode({
      realmName: "acme",
      clientId: preview.client_id,
      clientSecret: preview.secret,
      code,
      redirectUri: preview.redirect_uri,
      codeVerifier: "",
      issuer,
    });
    const profile = await userInfo("acme", tokens.access_token, issuer);
    const roles = profile.realm_access.roles;

    return (
      <div className="stage">
        <section className="login-window result-window">
          <h1>Olá, {profile.given_name}</h1>
          <p className="lede">O Customer App trocou o authorization code por tokens do realm Acme.</p>
          <dl className="meta-list">
            <div>
              <dt>Usuário</dt>
              <dd>{profile.preferred_username}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Expira em</dt>
              <dd>{tokens.expires_in}s</dd>
            </div>
          </dl>
          <div className="chips">
            {roles.map((role) => (
              <span className="chip" key={role}>
                {role}
              </span>
            ))}
          </div>
          <a className="btn btn-primary" href="/">
            Voltar ao console
          </a>
        </section>
      </div>
    );
  } catch (error) {
    const message = error instanceof OidcError ? error.message : "Não foi possível concluir o login.";
    return (
      <AuthCard title="Código já usado" lede={message}>
        <a className="btn btn-primary" href="/clients">
          Testar de novo
        </a>
      </AuthCard>
    );
  }
}
