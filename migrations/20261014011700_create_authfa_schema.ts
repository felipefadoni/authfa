import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("realms", (table) => {
    table.text("id").primary();
    table.text("name").notNullable().unique();
    table.text("display_name").notNullable();
    table.text("private_key").notNullable();
    table.text("public_key").notNullable();
    table.integer("access_token_ttl").notNullable().defaultTo(300);
    table.text("login_theme");
    table.text("created_at").notNullable();
  });

  await knex.schema.createTable("users", (table) => {
    table.text("id").primary();
    table.text("realm_id").notNullable().references("id").inTable("realms").onDelete("CASCADE");
    table.text("username").notNullable();
    table.text("email").notNullable();
    table.text("first_name").notNullable();
    table.text("last_name").notNullable();
    table.integer("enabled").notNullable().defaultTo(1);
    table.integer("email_verified").notNullable().defaultTo(0);
    table.integer("password_temporary").notNullable().defaultTo(0);
    table.text("password_hash").notNullable();
    table.text("last_login_at");
    table.text("created_at").notNullable();
    table.text("updated_at").notNullable();
    table.unique(["realm_id", "username"]);
    table.index(["realm_id", "email"], "idx_users_realm_email");
  });

  await knex.schema.createTable("clients", (table) => {
    table.text("id").primary();
    table.text("realm_id").notNullable().references("id").inTable("realms").onDelete("CASCADE");
    table.text("client_id").notNullable();
    table.text("name").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("secret");
    table.integer("public_client").notNullable().defaultTo(0);
    table.text("redirect_uris").notNullable().defaultTo("[]");
    table.text("web_origins").notNullable().defaultTo("[]");
    table.integer("enabled").notNullable().defaultTo(1);
    table.integer("standard_flow").notNullable().defaultTo(1);
    table.text("created_at").notNullable();
    table.unique(["realm_id", "client_id"]);
  });

  await knex.schema.createTable("roles", (table) => {
    table.text("id").primary();
    table.text("realm_id").notNullable().references("id").inTable("realms").onDelete("CASCADE");
    table.text("name").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("created_at").notNullable();
    table.unique(["realm_id", "name"]);
  });

  await knex.schema.createTable("groups", (table) => {
    table.text("id").primary();
    table.text("realm_id").notNullable().references("id").inTable("realms").onDelete("CASCADE");
    table.text("name").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("created_at").notNullable();
    table.unique(["realm_id", "name"]);
  });

  await knex.schema.createTable("user_roles", (table) => {
    table.text("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("role_id").notNullable().references("id").inTable("roles").onDelete("CASCADE");
    table.primary(["user_id", "role_id"]);
  });

  await knex.schema.createTable("user_groups", (table) => {
    table.text("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("group_id").notNullable().references("id").inTable("groups").onDelete("CASCADE");
    table.primary(["user_id", "group_id"]);
  });

  await knex.schema.createTable("sessions", (table) => {
    table.text("id").primary();
    table.text("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("realm_id").notNullable().references("id").inTable("realms").onDelete("CASCADE");
    table.text("created_at").notNullable();
    table.text("expires_at").notNullable();
    table.text("revoked_at");
    table.text("ip").notNullable().defaultTo("");
    table.text("user_agent").notNullable().defaultTo("");
    table.index(["realm_id", "expires_at"], "idx_sessions_realm_expiry");
  });

  await knex.schema.createTable("auth_codes", (table) => {
    table.text("code").primary();
    table.text("realm_id").notNullable().references("id").inTable("realms").onDelete("CASCADE");
    table.text("client_id").notNullable().references("id").inTable("clients").onDelete("CASCADE");
    table.text("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("session_id").notNullable().references("id").inTable("sessions").onDelete("CASCADE");
    table.text("redirect_uri").notNullable();
    table.text("scope").notNullable();
    table.text("nonce").notNullable().defaultTo("");
    table.text("code_challenge").notNullable().defaultTo("");
    table.text("code_challenge_method").notNullable().defaultTo("");
    table.text("expires_at").notNullable();
    table.text("used_at");
  });

  await knex.schema.createTable("refresh_tokens", (table) => {
    table.text("id").primary();
    table.text("token_hash").notNullable().unique();
    table.text("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("client_id").notNullable().references("id").inTable("clients").onDelete("CASCADE");
    table.text("realm_id").notNullable().references("id").inTable("realms").onDelete("CASCADE");
    table.text("session_id").notNullable().references("id").inTable("sessions").onDelete("CASCADE");
    table.text("expires_at").notNullable();
    table.text("revoked_at");
    table.text("created_at").notNullable();
  });

  await knex.schema.createTable("events", (table) => {
    table.text("id").primary();
    table.text("realm_id").notNullable().references("id").inTable("realms").onDelete("CASCADE");
    table.text("type").notNullable();
    table.text("user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.text("details").notNullable().defaultTo("");
    table.text("ip").notNullable().defaultTo("");
    table.text("created_at").notNullable();
    table.index(["realm_id", "created_at"], "idx_events_realm_created");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("events");
  await knex.schema.dropTableIfExists("refresh_tokens");
  await knex.schema.dropTableIfExists("auth_codes");
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("user_groups");
  await knex.schema.dropTableIfExists("user_roles");
  await knex.schema.dropTableIfExists("groups");
  await knex.schema.dropTableIfExists("roles");
  await knex.schema.dropTableIfExists("clients");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("realms");
}
