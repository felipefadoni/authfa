import type { Metadata } from "next";
import { DirectoryTable } from "@/components/directory-table";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { formatWhen, personAvatar } from "@/lib/format";
import { readParams } from "@/lib/query";
import { toneAt } from "@/lib/tones";
import { deleteGroupAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { listGroups } from "@/server/directory";

export const metadata: Metadata = { title: "Grupos" };

export default async function GroupsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const groups = await listGroups(context.realm.id, query.q);

  return (
    <>
      <PageHeader title="Grupos" action={{ href: "/groups/new", label: "Novo grupo" }} />
      <Notice error={query.error} />
      <p className="section-label">Grupos do realm</p>
      <DirectoryTable
        columns={{ name: "Nome", middle: "Membros", modified: "Criado em", meta: "Descrição" }}
        empty="Nenhum grupo encontrado."
        rows={groups.map((group, index) => ({
          id: group.id,
          href: `/groups/${group.id}`,
          tone: toneAt(index),
          title: group.name,
          avatars: group.members.map((member) => ({ ...personAvatar(member.first_name, member.last_name, member.username), label: member.username })),
          middle: group.members.length === 0 ? "Sem membros" : undefined,
          modified: formatWhen(group.created_at),
          meta: group.description || "—",
          menu: [
            { type: "link", href: `/groups/${group.id}`, label: "Abrir" },
            { type: "action", label: "Remover", action: deleteGroupAction, fields: { id: group.id }, danger: true },
          ],
        }))}
      />
    </>
  );
}
