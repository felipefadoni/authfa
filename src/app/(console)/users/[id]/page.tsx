import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { deleteUserAction, updateUserAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { getUser } from "@/server/directory";

export const metadata: Metadata = { title: "Usuário" };

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireConsoleContext();
  const { id } = await params;
  const query = await readParams(searchParams);
  const detail = await getUser(context.realm.id, id);
  if (!detail) notFound();
  const { user } = detail;

  return (
    <>
      <PageHeader title={`${user.first_name} ${user.last_name}`} />
      <Notice error={query.error} saved={query.saved} />
      <form className="panel" action={updateUserAction}>
        <input type="hidden" name="id" value={user.id} />
        <p className="lede">
          @{user.username} · criado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
        </p>
        <label className="field">
          <span>E-mail</span>
          <input name="email" type="email" required defaultValue={user.email} />
        </label>
        <label className="field">
          <span>Nome</span>
          <input name="firstName" required defaultValue={user.first_name} />
        </label>
        <label className="field">
          <span>Sobrenome</span>
          <input name="lastName" required defaultValue={user.last_name} />
        </label>
        <label className="field">
          <span>Nova senha</span>
          <input name="password" type="password" autoComplete="new-password" placeholder="Deixe em branco para manter" />
        </label>
        <div className="field">
          <span>Papéis</span>
          <div className="check-grid">
            {detail.roles.map((role) => (
              <label className="check" key={role.id}>
                <input type="checkbox" name="roleIds" value={role.id} defaultChecked={detail.roleIds.includes(role.id)} />
                {role.name}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Grupos</span>
          <div className="check-grid">
            {detail.groups.map((group) => (
              <label className="check" key={group.id}>
                <input type="checkbox" name="groupIds" value={group.id} defaultChecked={detail.groupIds.includes(group.id)} />
                {group.name}
              </label>
            ))}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" name="enabled" defaultChecked={Boolean(user.enabled)} />
          Conta ativa
        </label>
        <div className="actions">
          <button className="btn btn-primary" type="submit">
            Salvar
          </button>
        </div>
      </form>
      <form action={deleteUserAction} className="actions">
        <input type="hidden" name="id" value={user.id} />
        <button className="btn btn-danger" type="submit">
          Remover usuário
        </button>
      </form>
    </>
  );
}
