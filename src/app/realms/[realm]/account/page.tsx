import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AuthCard } from "@/components/auth-card";
import { SSO_COOKIE } from "@/server/cookies";
import { activeSession, findRealmByName, getLoginThemeByName, getUserById, userRoles } from "@/server/directory";
import { readSessionToken } from "@/server/token-cookie";

export const metadata: Metadata = { title: "Conta" };

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ realm: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { realm: realmName } = await params;
  const query = await searchParams;
  const error = typeof query.error === "string";
  const realm = await findRealmByName(realmName);
  const { theme } = await getLoginThemeByName(realmName);
  if (!realm) {
    return <AuthCard title="Realm não encontrado" lede="Confira o nome do realm na URL."><span /></AuthCard>;
  }

  const token = (await cookies()).get(SSO_COOKIE)?.value;
  if (token) {
    try {
      const claims = await readSessionToken(token);
      const session = await activeSession(claims.sid);
      const user = await getUserById(claims.sub);
      if (session && user && user.realm_id === realm.id && user.enabled) {
        const roles = await userRoles(user.id);
        return (
          <AuthCard title={`${user.first_name} ${user.last_name}`} lede={`Conta no realm ${realm.display_name}.`}>
            <p className="secret">{user.email}</p>
            <div className="chips">
              {roles.map((role) => (
                <span className="chip" key={role}>
                  {role}
                </span>
              ))}
            </div>
            <a className="btn btn-ghost" href={`/realms/${realmName}/protocol/openid-connect/logout`}>
              Sair
            </a>
          </AuthCard>
        );
      }
    } catch {
      // Mostra o formulário quando o cookie de SSO não vale mais.
    }
  }

  return (
    <AuthCard title={theme.title || realm.display_name} lede={theme.subtitle || "Entre para ver a sua conta neste realm."} theme={theme}>
      {error ? (
        <p className="form-error" role="alert">
          Usuário ou senha inválidos.
        </p>
      ) : null}
      <form className="panel" style={{ padding: 0, border: 0, boxShadow: "none", background: "transparent" }} action={`/realms/${realmName}/account/session`} method="post">
        <label className="field">
          <span>{theme.usernameLabel || "Usuário"}</span>
          <input name="username" required autoComplete="username" />
        </label>
        <label className="field">
          <span>{theme.passwordLabel || "Senha"}</span>
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button className="btn btn-primary" type="submit">
          {theme.buttonLabel || "Entrar"}
        </button>
      </form>
    </AuthCard>
  );
}
