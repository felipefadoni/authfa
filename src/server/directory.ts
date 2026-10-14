import "server-only";

import { exportPKCS8, exportSPKI, generateKeyPair } from "jose";
import type { Knex } from "knex";
import { getDb } from "@/server/db";
import { generateSecret, hashPassword, verifyPassword } from "@/server/passwords";
import { parseLoginTheme, type LoginTheme } from "@/lib/login-theme";
import { ready } from "@/server/schema";

export class DomainError extends Error {}

export type RealmRecord = {
  id: string;
  name: string;
  display_name: string;
  private_key: string;
  public_key: string;
  access_token_ttl: number;
  login_theme: string | null;
  created_at: string;
};

export type UserRecord = {
  id: string;
  realm_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  enabled: number;
  email_verified: number;
  password_temporary: number;
  password_hash: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientRecord = {
  id: string;
  realm_id: string;
  client_id: string;
  name: string;
  description: string;
  secret: string | null;
  public_client: number;
  redirect_uris: string;
  web_origins: string;
  enabled: number;
  standard_flow: number;
  created_at: string;
};

export type RoleRecord = {
  id: string;
  realm_id: string;
  name: string;
  description: string;
  created_at: string;
};

export type GroupRecord = {
  id: string;
  realm_id: string;
  name: string;
  description: string;
  created_at: string;
};

export type Avatar = { initials: string; color: string; label: string };

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
};

const ADMIN_ROLE_NAMES = ["admin", "realm-admin"];

async function database() {
  await ready();
  return getDb();
}

function likeTerm(value: string) {
  return `%${value.replace(/[%_]/g, "")}%`;
}

export function parseJsonList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function originsFrom(uris: string[]) {
  return [...new Set(uris.map((uri) => new URL(uri).origin))];
}

export async function recordEvent(input: {
  realmId: string;
  type: string;
  userId?: string | null;
  details?: string;
  ip?: string;
}) {
  const db = await database();
  await db("events").insert({
    id: crypto.randomUUID(),
    realm_id: input.realmId,
    type: input.type,
    user_id: input.userId ?? null,
    details: input.details ?? "",
    ip: input.ip ?? "",
    created_at: new Date().toISOString(),
  });
}

export async function findRealmByName(name: string) {
  const db = await database();
  return (await db("realms").where({ name }).first()) as RealmRecord | undefined;
}

export async function findRealmById(id: string) {
  const db = await database();
  return (await db("realms").where({ id }).first()) as RealmRecord | undefined;
}

export async function listRealms() {
  const db = await database();
  return (await db("realms").orderBy("name")) as RealmRecord[];
}

export async function isSystemAdmin(userId: string) {
  const db = await database();
  const role = await db("roles")
    .join("user_roles", "roles.id", "user_roles.role_id")
    .where("user_roles.user_id", userId)
    .andWhere("roles.name", "admin")
    .first();
  return Boolean(role);
}

export async function createRealm(input: { actorId: string; name: string; displayName: string; ip: string }) {
  if (!(await isSystemAdmin(input.actorId))) {
    throw new DomainError("Só o administrador do sistema cria realms.");
  }

  const db = await database();
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const [privatePem, publicPem] = await Promise.all([exportPKCS8(privateKey), exportSPKI(publicKey)]);

  await db.transaction(async (trx) => {
    const existing = await trx("realms").where({ name: input.name }).first();
    if (existing) throw new DomainError("Já existe um realm com esse nome.");

    await trx("realms").insert({
      id,
      name: input.name,
      display_name: input.displayName,
      private_key: privatePem,
      public_key: publicPem,
      access_token_ttl: 300,
      created_at: now,
    });
    await trx("roles").insert([
      {
        id: crypto.randomUUID(),
        realm_id: id,
        name: "realm-admin",
        description: "Administra este realm.",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        realm_id: id,
        name: `default-roles-${input.name}`,
        description: "Papel padrão de quem entra no realm.",
        created_at: now,
      },
    ]);
    await trx("events").insert({
      id: crypto.randomUUID(),
      realm_id: id,
      type: "REALM_CREATED",
      user_id: input.actorId,
      details: input.name,
      ip: input.ip,
      created_at: now,
    });
  });

  return { id, name: input.name };
}

export async function manageableRealms(userId: string) {
  const db = await database();
  const roles = (await db("roles")
    .join("user_roles", "roles.id", "user_roles.role_id")
    .where("user_roles.user_id", userId)
    .select("roles.name", "roles.realm_id")) as { name: string; realm_id: string }[];

  if (roles.some((role) => role.name === "admin")) {
    return listRealms();
  }

  const realmIds = roles.filter((role) => role.name === "realm-admin").map((role) => role.realm_id);
  return (await db("realms").whereIn("id", realmIds).orderBy("name")) as RealmRecord[];
}

export async function realmSnapshot(realmId: string) {
  const db = await database();
  const [users, clients, sessions, recent] = await Promise.all([
    db("users").where({ realm_id: realmId }).count({ total: "*" }).first(),
    db("clients").where({ realm_id: realmId }).count({ total: "*" }).first(),
    db("sessions")
      .where({ realm_id: realmId })
      .whereNull("revoked_at")
      .andWhere("expires_at", ">", new Date().toISOString())
      .count({ total: "*" })
      .first(),
    db("events")
      .where({ realm_id: realmId })
      .andWhere("created_at", ">", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .count({ total: "*" })
      .first(),
  ]);

  return {
    users: Number(users?.total ?? 0),
    clients: Number(clients?.total ?? 0),
    sessions: Number(sessions?.total ?? 0),
    alert: Number(recent?.total ?? 0) > 0,
  };
}

async function memberMap(db: Knex, table: "user_roles" | "user_groups", key: "role_id" | "group_id", realmId: string) {
  const rows = (await db(table)
    .join("users", "users.id", `${table}.user_id`)
    .where("users.realm_id", realmId)
    .select(`${table}.${key} as owner_id`, "users.id", "users.first_name", "users.last_name", "users.username")) as (Member & {
    owner_id: string;
  })[];

  const grouped = new Map<string, Member[]>();
  for (const row of rows) {
    const list = grouped.get(row.owner_id) ?? [];
    list.push(row);
    grouped.set(row.owner_id, list);
  }
  return grouped;
}

export async function listUsers(realmId: string, query = "") {
  const db = await database();
  const usersQuery = db("users").where({ realm_id: realmId });
  if (query) {
    const term = likeTerm(query);
    usersQuery.andWhere((builder) => {
      builder
        .where("username", "like", term)
        .orWhere("email", "like", term)
        .orWhere("first_name", "like", term)
        .orWhere("last_name", "like", term);
    });
  }

  const users = (await usersQuery.orderBy("last_login_at", "desc")) as UserRecord[];
  const links = (await db("user_roles")
    .join("roles", "roles.id", "user_roles.role_id")
    .where("roles.realm_id", realmId)
    .select("user_roles.user_id", "roles.name")) as { user_id: string; name: string }[];

  const rolesByUser = new Map<string, string[]>();
  for (const link of links) {
    const names = rolesByUser.get(link.user_id) ?? [];
    names.push(link.name);
    rolesByUser.set(link.user_id, names);
  }

  return users.map((user) => ({ ...user, roles: rolesByUser.get(user.id) ?? [] }));
}

export async function getUser(realmId: string, userId: string) {
  const db = await database();
  const user = (await db("users").where({ realm_id: realmId, id: userId }).first()) as UserRecord | undefined;
  if (!user) return null;

  const roles = (await db("roles").where({ realm_id: realmId }).orderBy("name")) as RoleRecord[];
  const groups = (await db("groups").where({ realm_id: realmId }).orderBy("name")) as GroupRecord[];
  const roleLinks = (await db("user_roles").where({ user_id: userId }).select("role_id")) as { role_id: string }[];
  const groupLinks = (await db("user_groups").where({ user_id: userId }).select("group_id")) as { group_id: string }[];

  return {
    user,
    roles,
    groups,
    roleIds: roleLinks.map((link) => link.role_id),
    groupIds: groupLinks.map((link) => link.group_id),
  };
}

async function assertRealmIds(trx: Knex.Transaction, table: "roles" | "groups", realmId: string, ids: string[]) {
  if (ids.length === 0) return;
  const rows = await trx(table).where({ realm_id: realmId }).whereIn("id", ids).select("id");
  if (rows.length !== new Set(ids).size) {
    throw new DomainError("Há um vínculo que não pertence a este realm.");
  }
}

async function assertKeepsAdministrator(
  trx: Knex.Transaction,
  realmId: string,
  userId: string,
  nextRoleIds: string[] | null,
) {
  const adminRoles = (await trx("roles").where({ realm_id: realmId }).whereIn("name", ADMIN_ROLE_NAMES)) as RoleRecord[];
  for (const adminRole of adminRoles) {
    const currently = await trx("user_roles").where({ user_id: userId, role_id: adminRole.id }).first();
    const keeps = nextRoleIds?.includes(adminRole.id) ?? false;
    if (!currently || keeps) continue;
    const other = await trx("user_roles").where({ role_id: adminRole.id }).whereNot({ user_id: userId }).first();
    if (!other) {
      throw new DomainError("O realm precisa de pelo menos um administrador.");
    }
  }
}

export async function createUser(input: {
  realmId: string;
  actorId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  temporary: boolean;
  enabled: boolean;
  roleIds: string[];
  groupIds: string[];
  ip: string;
}) {
  const db = await database();
  const passwordHash = await hashPassword(input.password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.transaction(async (trx) => {
    await assertRealmIds(trx, "roles", input.realmId, input.roleIds);
    await assertRealmIds(trx, "groups", input.realmId, input.groupIds);
    const duplicate = await trx("users").where({ realm_id: input.realmId, username: input.username }).first();
    if (duplicate) throw new DomainError("Já existe um usuário com esse nome.");

    await trx("users").insert({
      id,
      realm_id: input.realmId,
      username: input.username,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      enabled: input.enabled ? 1 : 0,
      email_verified: 0,
      password_temporary: input.temporary ? 1 : 0,
      password_hash: passwordHash,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    });

    const defaultRoles = (await trx("roles")
      .where({ realm_id: input.realmId })
      .andWhere("name", "like", "default-roles-%")
      .select("id")) as { id: string }[];
    const roleIds = [...new Set([...input.roleIds, ...defaultRoles.map((role) => role.id)])];
    if (roleIds.length > 0) {
      await trx("user_roles").insert(roleIds.map((roleId) => ({ user_id: id, role_id: roleId })));
    }
    if (input.groupIds.length > 0) {
      await trx("user_groups").insert(input.groupIds.map((groupId) => ({ user_id: id, group_id: groupId })));
    }
    await trx("events").insert({
      id: crypto.randomUUID(),
      realm_id: input.realmId,
      type: "USER_CREATED",
      user_id: input.actorId,
      details: input.username,
      ip: input.ip,
      created_at: now,
    });
  });

  return id;
}

export async function updateUser(input: {
  realmId: string;
  actorId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  password?: string;
  roleIds: string[];
  groupIds: string[];
  ip: string;
}) {
  const db = await database();
  const passwordHash = input.password ? await hashPassword(input.password) : null;

  await db.transaction(async (trx) => {
    const user = (await trx("users").where({ id: input.userId, realm_id: input.realmId }).first()) as UserRecord | undefined;
    if (!user) throw new DomainError("Usuário não encontrado.");
    if (input.actorId === input.userId && !input.enabled) {
      throw new DomainError("Você não pode desativar a própria conta.");
    }
    await assertRealmIds(trx, "roles", input.realmId, input.roleIds);
    await assertRealmIds(trx, "groups", input.realmId, input.groupIds);
    await assertKeepsAdministrator(trx, input.realmId, input.userId, input.roleIds);

    await trx("users")
      .where({ id: input.userId })
      .update({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        enabled: input.enabled ? 1 : 0,
        updated_at: new Date().toISOString(),
        ...(passwordHash ? { password_hash: passwordHash, password_temporary: 0 } : {}),
      });
    await trx("user_roles").where({ user_id: input.userId }).delete();
    if (input.roleIds.length > 0) {
      await trx("user_roles").insert(input.roleIds.map((roleId) => ({ user_id: input.userId, role_id: roleId })));
    }
    await trx("user_groups").where({ user_id: input.userId }).delete();
    if (input.groupIds.length > 0) {
      await trx("user_groups").insert(input.groupIds.map((groupId) => ({ user_id: input.userId, group_id: groupId })));
    }
    await trx("events").insert({
      id: crypto.randomUUID(),
      realm_id: input.realmId,
      type: "USER_UPDATED",
      user_id: input.actorId,
      details: user.username,
      ip: input.ip,
      created_at: new Date().toISOString(),
    });
  });
}

export async function setUserEnabled(realmId: string, actorId: string, userId: string, enabled: boolean, ip: string) {
  const detail = await getUser(realmId, userId);
  if (!detail) throw new DomainError("Usuário não encontrado.");
  await updateUser({
    realmId,
    actorId,
    userId,
    email: detail.user.email,
    firstName: detail.user.first_name,
    lastName: detail.user.last_name,
    enabled,
    roleIds: detail.roleIds,
    groupIds: detail.groupIds,
    ip,
  });
}

export async function deleteUser(realmId: string, actorId: string, userId: string, ip: string) {
  const db = await database();
  await db.transaction(async (trx) => {
    const user = (await trx("users").where({ id: userId, realm_id: realmId }).first()) as UserRecord | undefined;
    if (!user) throw new DomainError("Usuário não encontrado.");
    if (actorId === userId) throw new DomainError("Você não pode remover a própria conta.");
    await assertKeepsAdministrator(trx, realmId, userId, null);
    await trx("users").where({ id: userId }).delete();
    await trx("events").insert({
      id: crypto.randomUUID(),
      realm_id: realmId,
      type: "USER_DELETED",
      user_id: actorId,
      details: user.username,
      ip,
      created_at: new Date().toISOString(),
    });
  });
}

export async function listClients(realmId: string, query = "") {
  const db = await database();
  const clientsQuery = db("clients").where({ realm_id: realmId });
  if (query) {
    const term = likeTerm(query);
    clientsQuery.andWhere((builder) => {
      builder.where("name", "like", term).orWhere("client_id", "like", term);
    });
  }
  return (await clientsQuery.orderBy("name")) as ClientRecord[];
}

export async function getClient(realmId: string, id: string) {
  const db = await database();
  return (await db("clients").where({ realm_id: realmId, id }).first()) as ClientRecord | undefined;
}

export async function getClientByClientId(realmId: string, clientId: string) {
  const db = await database();
  return (await db("clients").where({ realm_id: realmId, client_id: clientId }).first()) as ClientRecord | undefined;
}

export async function createClient(input: {
  realmId: string;
  actorId: string;
  clientId: string;
  name: string;
  description: string;
  publicClient: boolean;
  redirectUris: string[];
  ip: string;
}) {
  const db = await database();
  const id = crypto.randomUUID();
  const secret = input.publicClient ? null : generateSecret();
  const now = new Date().toISOString();

  await db.transaction(async (trx) => {
    const duplicate = await trx("clients").where({ realm_id: input.realmId, client_id: input.clientId }).first();
    if (duplicate) throw new DomainError("Já existe um cliente com esse identificador.");
    await trx("clients").insert({
      id,
      realm_id: input.realmId,
      client_id: input.clientId,
      name: input.name,
      description: input.description,
      secret,
      public_client: input.publicClient ? 1 : 0,
      redirect_uris: JSON.stringify(input.redirectUris),
      web_origins: JSON.stringify(originsFrom(input.redirectUris)),
      enabled: 1,
      standard_flow: 1,
      created_at: now,
    });
    await trx("events").insert({
      id: crypto.randomUUID(),
      realm_id: input.realmId,
      type: "CLIENT_CREATED",
      user_id: input.actorId,
      details: input.clientId,
      ip: input.ip,
      created_at: now,
    });
  });

  return id;
}

export async function updateClient(input: {
  realmId: string;
  actorId: string;
  id: string;
  name: string;
  description: string;
  redirectUris: string[];
  enabled: boolean;
  standardFlow: boolean;
  ip: string;
}) {
  const db = await database();
  const updated = await db("clients")
    .where({ id: input.id, realm_id: input.realmId })
    .update({
      name: input.name,
      description: input.description,
      redirect_uris: JSON.stringify(input.redirectUris),
      web_origins: JSON.stringify(originsFrom(input.redirectUris)),
      enabled: input.enabled ? 1 : 0,
      standard_flow: input.standardFlow ? 1 : 0,
    });
  if (!updated) throw new DomainError("Cliente não encontrado.");
  await recordEvent({
    realmId: input.realmId,
    type: "CLIENT_UPDATED",
    userId: input.actorId,
    details: input.name,
    ip: input.ip,
  });
}

export async function regenerateSecret(realmId: string, actorId: string, id: string, ip: string) {
  const db = await database();
  const secret = generateSecret();
  const client = (await db("clients").where({ id, realm_id: realmId }).first()) as ClientRecord | undefined;
  if (!client) throw new DomainError("Cliente não encontrado.");
  if (client.public_client) throw new DomainError("Cliente público não tem segredo.");
  await db("clients").where({ id }).update({ secret });
  await recordEvent({ realmId, type: "CLIENT_UPDATED", userId: actorId, details: `${client.client_id} secret`, ip });
  return secret;
}

export async function deleteClient(realmId: string, actorId: string, id: string, ip: string) {
  const db = await database();
  const client = (await db("clients").where({ id, realm_id: realmId }).first()) as ClientRecord | undefined;
  if (!client) throw new DomainError("Cliente não encontrado.");
  await db("clients").where({ id }).delete();
  await recordEvent({ realmId, type: "CLIENT_UPDATED", userId: actorId, details: `removido ${client.client_id}`, ip });
}

export async function listRoles(realmId: string, query = "") {
  const db = await database();
  const rolesQuery = db("roles").where({ realm_id: realmId });
  if (query) rolesQuery.andWhere("name", "like", likeTerm(query));
  const roles = (await rolesQuery.orderBy("name")) as RoleRecord[];
  const members = await memberMap(db, "user_roles", "role_id", realmId);
  return roles.map((role) => ({ ...role, members: members.get(role.id) ?? [] }));
}

export async function getRole(realmId: string, id: string) {
  const db = await database();
  const role = (await db("roles").where({ realm_id: realmId, id }).first()) as RoleRecord | undefined;
  if (!role) return null;
  const members = await memberMap(db, "user_roles", "role_id", realmId);
  return { ...role, members: members.get(role.id) ?? [] };
}

export async function createRole(input: {
  realmId: string;
  actorId: string;
  name: string;
  description: string;
  ip: string;
}) {
  const db = await database();
  const id = crypto.randomUUID();
  try {
    await db("roles").insert({
      id,
      realm_id: input.realmId,
      name: input.name,
      description: input.description,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new DomainError("Já existe um papel com esse nome.");
    }
    throw error;
  }
  await recordEvent({ realmId: input.realmId, type: "ROLE_CREATED", userId: input.actorId, details: input.name, ip: input.ip });
  return id;
}

export async function deleteRole(realmId: string, actorId: string, id: string, ip: string) {
  const db = await database();
  const role = (await db("roles").where({ id, realm_id: realmId }).first()) as RoleRecord | undefined;
  if (!role) throw new DomainError("Papel não encontrado.");
  if (ADMIN_ROLE_NAMES.includes(role.name) || role.name.startsWith("default-roles-")) {
    throw new DomainError("Esse papel estrutural do realm não pode ser removido.");
  }
  await db("roles").where({ id }).delete();
  await recordEvent({ realmId, type: "USER_UPDATED", userId: actorId, details: `papel removido ${role.name}`, ip });
}

export async function listGroups(realmId: string, query = "") {
  const db = await database();
  const groupsQuery = db("groups").where({ realm_id: realmId });
  if (query) groupsQuery.andWhere("name", "like", likeTerm(query));
  const groups = (await groupsQuery.orderBy("name")) as GroupRecord[];
  const members = await memberMap(db, "user_groups", "group_id", realmId);
  return groups.map((group) => ({ ...group, members: members.get(group.id) ?? [] }));
}

export async function getGroup(realmId: string, id: string) {
  const db = await database();
  const group = (await db("groups").where({ realm_id: realmId, id }).first()) as GroupRecord | undefined;
  if (!group) return null;
  const members = await memberMap(db, "user_groups", "group_id", realmId);
  return { ...group, members: members.get(group.id) ?? [] };
}

export async function createGroup(input: {
  realmId: string;
  actorId: string;
  name: string;
  description: string;
  ip: string;
}) {
  const db = await database();
  const id = crypto.randomUUID();
  try {
    await db("groups").insert({
      id,
      realm_id: input.realmId,
      name: input.name,
      description: input.description,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new DomainError("Já existe um grupo com esse nome.");
    }
    throw error;
  }
  await recordEvent({ realmId: input.realmId, type: "GROUP_CREATED", userId: input.actorId, details: input.name, ip: input.ip });
  return id;
}

export async function deleteGroup(realmId: string, actorId: string, id: string, ip: string) {
  const db = await database();
  const group = (await db("groups").where({ id, realm_id: realmId }).first()) as GroupRecord | undefined;
  if (!group) throw new DomainError("Grupo não encontrado.");
  await db("groups").where({ id }).delete();
  await recordEvent({ realmId, type: "USER_UPDATED", userId: actorId, details: `grupo removido ${group.name}`, ip });
}

export async function listSessions(realmId: string, query = "") {
  const db = await database();
  const sessionsQuery = db("sessions")
    .join("users", "users.id", "sessions.user_id")
    .where("sessions.realm_id", realmId)
    .whereNull("sessions.revoked_at")
    .andWhere("sessions.expires_at", ">", new Date().toISOString())
    .select(
      "sessions.id",
      "sessions.created_at",
      "sessions.expires_at",
      "sessions.ip",
      "sessions.user_agent",
      "users.first_name",
      "users.last_name",
      "users.username",
    );
  if (query) {
    const term = likeTerm(query);
    sessionsQuery.andWhere((builder) => {
      builder.where("users.username", "like", term).orWhere("users.first_name", "like", term);
    });
  }
  return (await sessionsQuery.orderBy("sessions.created_at", "desc")) as {
    id: string;
    created_at: string;
    expires_at: string;
    ip: string;
    user_agent: string;
    first_name: string;
    last_name: string;
    username: string;
  }[];
}

export async function revokeSession(realmId: string, actorId: string, sessionId: string, ip: string) {
  const db = await database();
  const updated = await db("sessions")
    .where({ id: sessionId, realm_id: realmId })
    .whereNull("revoked_at")
    .update({ revoked_at: new Date().toISOString() });
  if (!updated) throw new DomainError("Sessão não encontrada.");
  await db("refresh_tokens").where({ session_id: sessionId }).whereNull("revoked_at").update({ revoked_at: new Date().toISOString() });
  await recordEvent({ realmId, type: "SESSION_REVOKED", userId: actorId, details: sessionId, ip });
}

export async function listEvents(realmId: string, query = "") {
  const db = await database();
  const eventsQuery = db("events")
    .leftJoin("users", "users.id", "events.user_id")
    .where("events.realm_id", realmId)
    .select(
      "events.id",
      "events.type",
      "events.details",
      "events.ip",
      "events.created_at",
      "users.username",
      "users.first_name",
      "users.last_name",
    );
  if (query) {
    const term = likeTerm(query);
    eventsQuery.andWhere((builder) => {
      builder.where("events.type", "like", term).orWhere("events.details", "like", term).orWhere("users.username", "like", term);
    });
  }
  return (await eventsQuery.orderBy("events.created_at", "desc").limit(100)) as {
    id: string;
    type: string;
    details: string;
    ip: string;
    created_at: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
  }[];
}

export async function latestEvent(realmId: string) {
  const db = await database();
  return (await db("events").where({ realm_id: realmId }).orderBy("created_at", "desc").first()) as
    | { created_at: string }
    | undefined;
}

export async function updateRealm(realmId: string, actorId: string, displayName: string, accessTokenTtl: number, ip: string) {
  const db = await database();
  await db("realms").where({ id: realmId }).update({ display_name: displayName, access_token_ttl: accessTokenTtl });
  await recordEvent({ realmId, type: "CLIENT_UPDATED", userId: actorId, details: "ajustes do realm", ip });
}

export async function getLoginTheme(realmId: string) {
  const db = await database();
  const realm = (await db("realms").where({ id: realmId }).first()) as RealmRecord | undefined;
  return parseLoginTheme(realm?.login_theme);
}

export async function getLoginThemeByName(realmName: string) {
  const realm = await findRealmByName(realmName);
  return { realm, theme: parseLoginTheme(realm?.login_theme) };
}

export async function saveLoginTheme(realmId: string, actorId: string, theme: LoginTheme, ip: string) {
  const db = await database();
  const updated = await db("realms").where({ id: realmId }).update({ login_theme: JSON.stringify(theme) });
  if (!updated) throw new DomainError("Realm não encontrado.");
  await recordEvent({ realmId, type: "LOGIN_SCREEN_UPDATED", userId: actorId, details: "tela de login", ip });
}

export async function authenticate(realmName: string, username: string, password: string, ip: string) {
  const db = await database();
  const realm = (await db("realms").where({ name: realmName }).first()) as RealmRecord | undefined;
  if (!realm) return null;
  const user = (await db("users").where({ realm_id: realm.id, username }).first()) as UserRecord | undefined;
  const valid = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !valid || !user.enabled) {
    await recordEvent({
      realmId: realm.id,
      type: "LOGIN_FAILED",
      userId: user?.id,
      details: username,
      ip,
    });
    return null;
  }
  await db("users").where({ id: user.id }).update({ last_login_at: new Date().toISOString() });
  return { realm, user };
}

export async function authenticateConsole(
  username: string,
  password: string,
  ip: string,
): Promise<{ error: string } | { user: UserRecord; realm: RealmRecord; realms: RealmRecord[] }> {
  const db = await database();
  const candidates = (await db("users").where({ username })) as UserRecord[];
  const matches: UserRecord[] = [];
  for (const candidate of candidates) {
    if (await verifyPassword(password, candidate.password_hash)) matches.push(candidate);
  }
  if (matches.length !== 1) {
    return { error: "Usuário ou senha inválidos." as const };
  }
  const user = matches[0];
  if (!user || !user.enabled) return { error: "Usuário ou senha inválidos." as const };

  const realms = await manageableRealms(user.id);
  if (realms.length === 0) {
    await recordEvent({ realmId: user.realm_id, type: "LOGIN_FAILED", userId: user.id, details: "console", ip });
    return { error: "Essa conta não administra um realm." as const };
  }

  await db("users").where({ id: user.id }).update({ last_login_at: new Date().toISOString() });
  const realm = (await db("realms").where({ id: user.realm_id }).first()) as RealmRecord;
  await recordEvent({ realmId: realm.id, type: "LOGIN", userId: user.id, details: "console", ip });
  return { user, realm, realms };
}

export async function createSession(input: { userId: string; realmId: string; ip: string; userAgent: string }) {
  const db = await database();
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
  await db("sessions").insert({
    id,
    user_id: input.userId,
    realm_id: input.realmId,
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
    ip: input.ip,
    user_agent: input.userAgent.slice(0, 180),
  });
  return { id, expiresAt: expiresAt.toISOString() };
}

export async function activeSession(sessionId: string) {
  const db = await database();
  const session = (await db("sessions").where({ id: sessionId }).first()) as
    | { id: string; user_id: string; realm_id: string; expires_at: string; revoked_at: string | null }
    | undefined;
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() < Date.now()) return null;
  return session;
}

export async function userRoles(userId: string) {
  const db = await database();
  const rows = (await db("roles")
    .join("user_roles", "roles.id", "user_roles.role_id")
    .where("user_roles.user_id", userId)
    .orderBy("roles.name")
    .select("roles.name")) as { name: string }[];
  return rows.map((row) => row.name);
}

export async function getUserById(userId: string) {
  const db = await database();
  return (await db("users").where({ id: userId }).first()) as UserRecord | undefined;
}
