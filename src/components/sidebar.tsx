"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/icons";

const items = [
  { href: "/", label: "Visão geral", icon: "home" },
  { href: "/users", label: "Usuários", icon: "users" },
  { href: "/clients", label: "Clientes", icon: "clients" },
  { href: "/roles", label: "Papéis", icon: "roles" },
  { href: "/groups", label: "Grupos", icon: "groups" },
  { href: "/sessions", label: "Sessões", icon: "sessions" },
  { href: "/events", label: "Eventos", icon: "events" },
] as const;

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Console">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={active(pathname, item.href) ? "active" : undefined} aria-current={active(pathname, item.href) ? "page" : undefined}>
          <NavIcon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
