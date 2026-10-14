import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Knex } from "knex";

const POOL_MIN = 0;
const POOL_MAX_DEV = 5;
const POOL_MAX_PROD = 20;

function loadLocalEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator);
    if (process.env[key]) continue;
    let value = trimmed.slice(separator + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadLocalEnv();

const baseConfig: Partial<Knex.Config> = {
  client: "pg",
  migrations: {
    directory: "./migrations",
    extension: "ts",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./seeds",
    extension: "ts",
  },
};

const config: Record<string, Knex.Config> = {
  development: {
    ...baseConfig,
    connection: process.env.DATABASE_URL,
    pool: { min: POOL_MIN, max: POOL_MAX_DEV },
  },
  production: {
    ...baseConfig,
    connection: process.env.DATABASE_URL,
    pool: { min: POOL_MIN, max: POOL_MAX_PROD },
  },
};

export { config };
export default config;
