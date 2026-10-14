import type { Metadata } from "next";
import { DirectoryTable } from "@/components/directory-table";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { colorFrom, formatWhen } from "@/lib/format";
import { readParams } from "@/lib/query";
import { toneAt } from "@/lib/tones";
import { deleteClientAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { listClients } from "@/server/directory";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const clients = await listClients(context.realm.id, query.q);

  return (
    <>
      <PageHeader title="Clientes" action={{ href: "/clients/new", label: "Novo cliente" }} />
      <Notice error={query.error} />
      <p className="section-label">OpenID Connect</p>
      <DirectoryTable
        columns={{ name: "Nome", middle: "Protocolo", modified: "Criado em", meta: "Tipo" }}
        empty="Nenhum cliente encontrado."
        rows={clients.map((client, index) => ({
          id: client.id,
          href: `/clients/${client.id}`,
          tone: toneAt(index),
          title: client.name,
          avatars: [{ initials: "OID", color: colorFrom(client.client_id), label: client.client_id }],
          modified: formatWhen(client.created_at),
          meta: client.public_client ? "Público" : "Confidencial",
          menu: [
            { type: "link", href: `/clients/${client.id}`, label: "Abrir" },
            { type: "action", label: "Remover", action: deleteClientAction, fields: { id: client.id }, danger: true },
          ],
        }))}
      />
    </>
  );
}
