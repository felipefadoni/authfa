import type { Metadata } from "next";
import { DirectoryTable } from "@/components/directory-table";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { colorFrom, formatWhen } from "@/lib/format";
import { readParams } from "@/lib/query";
import { toneAt } from "@/lib/tones";
import { deleteUserAction, setUserEnabledAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { listUsers } from "@/server/directory";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const users = await listUsers(context.realm.id, query.q);

  return (
    <>
      <PageHeader title="Usuários" action={{ href: "/users/new", label: "Novo usuário" }} />
      <Notice error={query.error} />
      <p className="section-label">{query.q ? `Busca por “${query.q}”` : "Diretório"}</p>
      <DirectoryTable
        columns={{ name: "Nome", middle: "Papéis", modified: "Último acesso", meta: "Status" }}
        empty="Nenhum usuário encontrado."
        rows={users.map((user, index) => ({
          id: user.id,
          href: `/users/${user.id}`,
          tone: toneAt(index),
          title: `${user.first_name} ${user.last_name}`,
          avatars: user.roles.map((role) => ({ initials: role.slice(0, 2).toUpperCase(), color: colorFrom(role), label: role })),
          modified: formatWhen(user.last_login_at),
          meta: user.enabled ? (user.password_temporary ? "Temporária" : "Ativo") : "Inativo",
          selected: user.id === context.user.id,
          menu: [
            { type: "link", href: `/users/${user.id}`, label: "Abrir" },
            {
              type: "action",
              label: user.enabled ? "Desativar" : "Ativar",
              action: setUserEnabledAction,
              fields: { id: user.id, enabled: user.enabled ? "0" : "1" },
            },
            { type: "action", label: "Remover", action: deleteUserAction, fields: { id: user.id }, danger: true },
          ],
        }))}
      />
    </>
  );
}
