import "server-only";

import knex, { type Knex } from "knex";
import { config } from "../../knexfile";

const ACQUIRE_TIMEOUT_MS = 30_000;

type DatabaseGlobal = typeof globalThis & {
  authfaDb?: Knex;
  authfaShutdownBound?: boolean;
};

const globalState = globalThis as DatabaseGlobal;

function createDatabase() {
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";

  return knex({
    ...config[environment],
    acquireConnectionTimeout: ACQUIRE_TIMEOUT_MS,
  });
}

function setupGracefulShutdown(database: Knex) {
  if (globalState.authfaShutdownBound) return;
  globalState.authfaShutdownBound = true;

  const shutdown = async () => {
    await database.destroy();
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });
}

export function getDb() {
  if (!globalState.authfaDb) {
    globalState.authfaDb = createDatabase();
    setupGracefulShutdown(globalState.authfaDb);
  }
  return globalState.authfaDb;
}
