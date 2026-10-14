import Link from "next/link";
import type { ConsoleContext } from "@/server/console";
import { BellIcon, LogoMark } from "@/components/icons";
import { Sidebar } from "@/components/sidebar";
import { SideFoot } from "@/components/side-foot";

export function ConsoleFrame({ context, children }: { context: ConsoleContext; children: React.ReactNode }) {
  const { user, realm, realms, stats, alert } = context;

  return (
    <div className="console-shell">
      <aside className="side">
        <Link className="brand" href="/">
          <LogoMark />
          <span>AuthFa</span>
        </Link>
        <Sidebar />
          <SideFoot
            name={user.shortName}
            realmName={realm.displayName}
            users={stats.users}
            clients={stats.clients}
            realms={realms}
            currentRealm={realm.name}
            systemAdmin={context.systemAdmin}
          />
      </aside>

      <div className="main-col">
        <header className="hello">
          <div>
            <h1>Olá, {user.shortName}</h1>
            <p>O realm {realm.displayName} reúne as pessoas, os clientes e as sessões deste ambiente.</p>
          </div>
          <div className="hello-tools">
            <Link className="icon-bubble" href="/events" aria-label="Eventos">
              <BellIcon />
              {alert ? <span className="dot" /> : null}
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
