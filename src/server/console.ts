import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CONSOLE_COOKIE, REALM_COOKIE } from "@/server/cookies";
import {
  activeSession,
  findRealmById,
  getUserById,
  isSystemAdmin,
  manageableRealms,
  realmSnapshot,
} from "@/server/directory";
import { readSessionToken, type SessionClaims } from "@/server/token-cookie";

export type ConsoleContext = {
  claims: SessionClaims;
  user: { id: string; name: string; shortName: string; username: string; initial: string };
  realm: { id: string; name: string; displayName: string; accessTokenTtl: number };
  realms: { name: string; displayName: string }[];
  stats: { users: number; clients: number; sessions: number };
  alert: boolean;
  systemAdmin: boolean;
};

export async function readConsoleClaims() {
  const jar = await cookies();
  const token = jar.get(CONSOLE_COOKIE)?.value;
  if (!token) return null;
  try {
    return await readSessionToken(token);
  } catch {
    return null;
  }
}

export async function requireConsoleContext(): Promise<ConsoleContext> {
  const claims = await readConsoleClaims();
  if (!claims) redirect("/login");

  const session = await activeSession(claims.sid);
  const user = await getUserById(claims.sub);
  if (!session || !user || !user.enabled) {
    const jar = await cookies();
    jar.delete(CONSOLE_COOKIE);
    redirect("/login?error=Sess%C3%A3o%20encerrada");
  }

  const realms = await manageableRealms(user.id);
  if (realms.length === 0) redirect("/login?error=Essa%20conta%20n%C3%A3o%20administra%20um%20realm");

  const jar = await cookies();
  const requested = jar.get(REALM_COOKIE)?.value;
  const realm = realms.find((item) => item.name === requested) ?? realms.find((item) => item.id === user.realm_id) ?? realms[0];
  if (!realm) redirect("/login");

  const fullRealm = await findRealmById(realm.id);
  if (!fullRealm) redirect("/login");
  const stats = await realmSnapshot(fullRealm.id);

  return {
    claims,
    user: {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      shortName: user.first_name,
      username: user.username,
      initial: user.first_name.charAt(0).toUpperCase(),
    },
    realm: {
      id: fullRealm.id,
      name: fullRealm.name,
      displayName: fullRealm.display_name,
      accessTokenTtl: fullRealm.access_token_ttl,
    },
    realms: realms.map((item) => ({ name: item.name, displayName: item.display_name })),
    stats: { users: stats.users, clients: stats.clients, sessions: stats.sessions },
    alert: stats.alert,
    systemAdmin: await isSystemAdmin(user.id),
  };
}
