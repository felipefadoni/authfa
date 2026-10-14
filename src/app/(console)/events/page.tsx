import type { Metadata } from "next";
import { DirectoryTable } from "@/components/directory-table";
import { PageHeader } from "@/components/page-header";
import { colorFrom, formatWhen, initials } from "@/lib/format";
import { readParams } from "@/lib/query";
import { toneAt } from "@/lib/tones";
import { requireConsoleContext } from "@/server/console";
import { listEvents } from "@/server/directory";

const labels: Record<string, string> = {
  LOGIN: "Login",
  LOGIN_FAILED: "Falha de login",
  LOGOUT: "Logout",
  USER_CREATED: "Usuário criado",
  USER_UPDATED: "Usuário atualizado",
  USER_DELETED: "Usuário removido",
  CLIENT_CREATED: "Cliente criado",
  CLIENT_UPDATED: "Cliente atualizado",
  ROLE_CREATED: "Papel criado",
  GROUP_CREATED: "Grupo criado",
  REALM_CREATED: "Realm criado",
  LOGIN_SCREEN_UPDATED: "Tela de login",
  SESSION_REVOKED: "Sessão revogada",
};

export const metadata: Metadata = { title: "Eventos" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const events = await listEvents(context.realm.id, query.q);

  return (
    <>
      <PageHeader title="Eventos" />
      <p className="section-label">Auditoria</p>
      <DirectoryTable
        columns={{ name: "Evento", middle: "Quem", modified: "Quando", meta: "Origem" }}
        empty="Nenhum evento."
        rows={events.map((event, index) => ({
          id: event.id,
          href: "/events",
          tone: toneAt(index),
          title: labels[event.type] ?? event.type,
          avatars: event.username
            ? [{ initials: initials(event.first_name ?? event.username, event.last_name ?? ""), color: colorFrom(event.username), label: event.username }]
            : [],
          middle: event.details || event.username || "—",
          modified: formatWhen(event.created_at),
          meta: event.ip || "—",
          menu: [],
        }))}
      />
    </>
  );
}
