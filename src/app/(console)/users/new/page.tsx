import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { createUserAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { listGroups, listRoles } from "@/server/directory";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function NewUserPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const [roles, groups] = await Promise.all([listRoles(context.realm.id), listGroups(context.realm.id)]);

  return (
    <>
      <PageHeader title="Novo usuário" />
      <Notice error={query.error} />
      <form className="panel" action={createUserAction}>
        <label className="field">
          <span>Usuário</span>
          <input name="username" required autoComplete="off" />
        </label>
        <label className="field">
          <span>E-mail</span>
          <input name="email" type="email" required />
        </label>
        <label className="field">
          <span>Nome</span>
          <input name="firstName" required />
        </label>
        <label className="field">
          <span>Sobrenome</span>
          <input name="lastName" required />
        </label>
        <label className="field">
          <span>Senha</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <div className="field">
          <span>Papéis</span>
          <div className="check-grid">
            {roles.map((role) => (
              <label className="check" key={role.id}>
                <input type="checkbox" name="roleIds" value={role.id} defaultChecked={role.name.startsWith("default-roles-")} />
                {role.name}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Grupos</span>
          <div className="check-grid">
            {groups.map((group) => (
              <label className="check" key={group.id}>
                <input type="checkbox" name="groupIds" value={group.id} />
                {group.name}
              </label>
            ))}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" name="enabled" defaultChecked />
          Conta ativa
        </label>
        <label className="check">
          <input type="checkbox" name="temporary" />
          Senha temporária
        </label>
        <div className="actions">
          <button className="btn btn-primary" type="submit">
            Criar usuário
          </button>
        </div>
      </form>
    </>
  );
}
