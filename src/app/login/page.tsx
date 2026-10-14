import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { Notice } from "@/components/notice";
import { loginAction } from "@/server/actions";
import { activeSession } from "@/server/directory";
import { readConsoleClaims } from "@/server/console";

export const metadata: Metadata = { title: "Entrar" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const claims = await readConsoleClaims();
  if (claims && (await activeSession(claims.sid))) redirect("/");
  const params = await searchParams;

  return (
    <AuthCard title="Entrar no console" lede="Administre realms, usuários, clientes e o login OpenID Connect.">
      <Notice error={one(params.error)} />
      <form action={loginAction} className="panel" style={{ padding: 0, border: 0, boxShadow: "none", background: "transparent" }}>
        <input type="hidden" name="next" value={one(params.next) || "/"} />
        <label className="field">
          <span>Usuário</span>
          <input name="username" autoComplete="username" required />
        </label>
        <label className="field">
          <span>Senha</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn btn-primary" type="submit">
          Entrar
        </button>
      </form>
    </AuthCard>
  );
}
