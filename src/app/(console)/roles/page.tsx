import type { Metadata } from "next";
import { DirectoryTable } from "@/components/directory-table";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { formatWhen, personAvatar } from "@/lib/format";
import { readParams } from "@/lib/query";
import { toneAt } from "@/lib/tones";
import { deleteRoleAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { listRoles } from "@/server/directory";

export const metadata: Metadata = { title: "Papéis" };

export default async function RolesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const roles = await listRoles(context.realm.id, query.q);

  return (
    <>
      <PageHeader title="Papéis" action={{ href: "/roles/new", label: "Novo papel" }} />
      <Notice error={query.error} />
      <p className="section-label">Papéis do realm</p>
      <DirectoryTable
        columns={{ name: "Nome", middle: "Membros", modified: "Criado em", meta: "Descrição" }}
        empty="Nenhum papel encontrado."
        rows={roles.map((role, index) => ({
          id: role.id,
          href: `/roles/${role.id}`,
          tone: toneAt(index),
          title: role.name,
          avatars: role.members.map((member) => ({ ...personAvatar(member.first_name, member.last_name, member.username), label: member.username })),
          middle: role.members.length === 0 ? "Sem membros" : undefined,
          modified: formatWhen(role.created_at),
          meta: role.description || "—",
          menu: [
            { type: "link", href: `/roles/${role.id}`, label: "Abrir" },
            { type: "action", label: "Remover", action: deleteRoleAction, fields: { id: role.id }, danger: true },
          ],
        }))}
      />
    </>
  );
}
