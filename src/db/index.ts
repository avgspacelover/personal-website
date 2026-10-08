import { mkdirSync } from "node:fs";
import * as schema from "./schema";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
const dir = process.env.PGLITE_DIR ?? ".data/pg";

// DATABASE_URL set -> Postgres. Unset -> embedded Postgres (PGlite) in .data/, for zero-setup local dev.
async function create(migrate: boolean): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const db = drizzle(postgres(url, { max: 5 }), { schema });
    if (migrate) await (await import("drizzle-orm/postgres-js/migrator")).migrate(db, { migrationsFolder: "drizzle" });
    return db as unknown as DB;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  mkdirSync(dir, { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  if (migrate) await (await import("drizzle-orm/pglite/migrator")).migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as DB;
}
const g = globalThis as unknown as { __db?: Promise<DB> };
export const getDb = () => (g.__db ??= create(false));
export const getMigratedDb = () => create(true);
export * from "./schema";
