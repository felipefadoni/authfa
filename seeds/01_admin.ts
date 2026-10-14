import { exportPKCS8, exportSPKI, generateKeyPair } from "jose";
import type { Knex } from "knex";
import { hashPassword } from "../src/server/passwords";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

export async function seed(knex: Knex): Promise<void> {
  const adminUsername = requiredEnv("AUTHFA_ADMIN_USERNAME");
  const adminPassword = requiredEnv("AUTHFA_ADMIN_PASSWORD");
  const adminEmail = requiredEnv("AUTHFA_ADMIN_EMAIL");
  const masterRealm = requiredEnv("AUTHFA_MASTER_REALM");

  await knex.transaction(async (trx) => {
    const now = new Date().toISOString();
    const existingUser = await trx("users").where({ username: adminUsername }).first<{ id: string }>();
    if (existingUser) return;

    let realm = await trx("realms").where({ name: masterRealm }).first<{ id: string }>();
    if (!realm) {
      const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
      const [privatePem, publicPem] = await Promise.all([exportPKCS8(privateKey), exportSPKI(publicKey)]);
      const realmId = crypto.randomUUID();
      await trx("realms").insert({
        id: realmId,
        name: masterRealm,
        display_name: masterRealm.charAt(0).toUpperCase() + masterRealm.slice(1),
        private_key: privatePem,
        public_key: publicPem,
        access_token_ttl: 300,
        created_at: now,
      });
      realm = { id: realmId };
    }

    const adminRole = await ensureRole(trx, realm.id, "admin", "Administra todos os realms.", now);
    const defaultRole = await ensureRole(trx, realm.id, `default-roles-${masterRealm}`, `Papel padrão do realm ${masterRealm}.`, now);
    const userId = crypto.randomUUID();

    await trx("users").insert({
      id: userId,
      realm_id: realm.id,
      username: adminUsername,
      email: adminEmail,
      first_name: "AuthFa",
      last_name: "Admin",
      enabled: 1,
      email_verified: 1,
      password_temporary: 0,
      password_hash: await hashPassword(adminPassword),
      created_at: now,
      updated_at: now,
    });

    await trx("user_roles").insert([
      { user_id: userId, role_id: adminRole },
      { user_id: userId, role_id: defaultRole },
    ]);
  });
}

async function ensureRole(knex: Knex, realmId: string, name: string, description: string, createdAt: string) {
  const existing = await knex("roles").where({ realm_id: realmId, name }).first<{ id: string }>();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await knex("roles").insert({ id, realm_id: realmId, name, description, created_at: createdAt });
  return id;
}
