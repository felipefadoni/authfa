import type { Metadata } from "next";
import { DirectoryTable } from "@/components/directory-table";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { formatWhen, personAvatar } from "@/lib/format";
import { readParams } from "@/lib/query";
import { toneAt } from "@/lib/tones";
import { revokeSessionAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { listSessions } from "@/server/directory";

export const metadata: Metadata = { title: "Sessões" };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const sessions = await listSessions(context.realm.id, query.q);

  return (
    <>
      <PageHeader title="Sessões" />
      <Notice error={query.error} />
      <p className="section-label">Sessões ativas</p>
      <DirectoryTable
        columns={{ name: "Usuário", middle: "Origem", modified: "Início", meta: "Expira" }}
        empty="Nenhuma sessão ativa."
        rows={sessions.map((session, index) => ({
          id: session.id,
          href: "/sessions",
          tone: toneAt(index),
          title: `${session.first_name} ${session.last_name}`,
          avatars: [personAvatar(session.first_name, session.last_name, session.username)],
          modified: formatWhen(session.created_at),
          meta: formatWhen(session.expires_at),
          selected: session.id === context.claims.sid,
          menu: [{ type: "action" as const, label: "Revogar", action: revokeSessionAction, fields: { id: session.id }, danger: true }],
        }))}
      />
    </>
  );
}
