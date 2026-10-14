"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions";
import { RealmSwitch } from "@/components/realm-switch";

function Icon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const items = [
  { href: "/realms/new", label: "Novo realm", adminOnly: true, path: "M12 5v14M5 12h14" },
  { href: "/login-screen", label: "Tela de login", adminOnly: false, path: "M4 6h16v12H4V6Zm0 3h16M8 4v2M16 4v2" },
  { href: "/settings", label: "Ajustes", adminOnly: false, path: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4h2M2 12h2M12 2v2M12 20v2M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M18.4 18.4l1.4 1.4M4.2 4.2l1.4 1.4" },
] as const;

export function SideFoot({
  name,
  realmName,
  users,
  clients,
  realms,
  currentRealm,
  systemAdmin,
}: {
  name: string;
  realmName: string;
  users: number;
  clients: number;
  realms: { name: string; displayName: string }[];
  currentRealm: string;
  systemAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="side-foot">
      <div className="side-realm">
        <span>
          <strong>{realmName}</strong>
          <em>
            {users} usuários · {clients} clientes
          </em>
        </span>
        <b>{name.slice(0, 1)}</b>
      </div>
      {realms.length > 1 ? <RealmSwitch realms={realms} current={currentRealm} /> : null}
      <nav className="side-menu" aria-label="Conta">
        {items
          .filter((item) => !item.adminOnly || systemAdmin)
          .map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
                <Icon path={item.path} />
                {item.label}
              </Link>
            );
          })}
        <form action={logoutAction}>
          <button type="submit">
            <Icon path="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2M15 12H3m0 0 3-3m-3 3 3 3" />
            Sair
          </button>
        </form>
      </nav>
    </div>
  );
}
