import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryTable } from "@/components/directory-table";
import { colorFrom, formatWhen, personAvatar } from "@/lib/format";
import { toneAt } from "@/lib/tones";
import { deleteUserAction, setUserEnabledAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { listClients, listUsers } from "@/server/directory";

export const metadata: Metadata = { title: "Visão geral" };

export default async function OverviewPage() {
  const context = await requireConsoleContext();
  const [clients, users] = await Promise.all([listClients(context.realm.id), listUsers(context.realm.id)]);

  return (
    <>
      <div className="stat-row">
        <Link className="stat stat-sand" href="/users">
          <span>Usuários</span>
          <strong>{context.stats.users}</strong>
        </Link>
        <Link className="stat stat-mist" href="/clients">
          <span>Clientes</span>
          <strong>{context.stats.clients}</strong>
        </Link>
        <Link className="stat stat-lilac" href="/sessions">
          <span>Sessões</span>
          <strong>{context.stats.sessions}</strong>
        </Link>
      </div>

      <div className="home-split">
        <section>
          <h2>Pessoas recentes</h2>
          <ul className="people-list">
            {users.slice(0, 3).map((user) => (
              <li key={user.id}>
                <Link href={`/users/${user.id}`}>
                  <span className="mini-avatar" style={{ background: colorFrom(user.username) }}>
                    {personAvatar(user.first_name, user.last_name, user.username).initials}
                  </span>
                  <span>
                    <strong>
                      {user.first_name} {user.last_name}
                    </strong>
                    <em>{user.email}</em>
                  </span>
                  <time>{formatWhen(user.last_login_at)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="client-board">
          <div className="client-board-top">
            <strong>{clients.length}</strong>
            <Link href="/clients">Ver todos</Link>
          </div>
          <p>clientes OpenID neste realm</p>
          <div className="client-pills">
            {clients.slice(0, 3).map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                {client.name}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <h2 className="block-title">Diretório</h2>
      <DirectoryTable
        columns={{ name: "Nome", middle: "Papéis", modified: "Último acesso", meta: "Status" }}
        empty="Nenhum usuário neste realm."
        rows={users.map((user, index) => ({
          id: user.id,
          href: `/users/${user.id}`,
          tone: toneAt(index),
          title: `${user.first_name} ${user.last_name}`,
          avatars: user.roles.map((role) => ({ initials: role.slice(0, 2).toUpperCase(), color: colorFrom(role), label: role })),
          modified: formatWhen(user.last_login_at),
          meta: user.enabled ? "Ativo" : "Inativo",
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
