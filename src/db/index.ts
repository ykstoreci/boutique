/**
 * Connexion à la base de données.
 *
 *  - DATABASE_URL=postgres://…   → PostgreSQL (production) via `pg`
 *  - DATABASE_URL=pglite:./dir   → PostgreSQL embarqué (développement, aucune installation)
 *
 * Les deux pilotes exécutent exactement le même schéma et les mêmes migrations SQL.
 */
import "server-only";
import { createDatabase, type Database } from "./client";
import { ensureArrivalsSchema } from "./embedded-sql";

const globalForDb = globalThis as unknown as { __boutiqueDb?: Promise<Database> };

export async function getDb(): Promise<Database> {
  if (!globalForDb.__boutiqueDb) {
    const url =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.DIRECT_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING;
    globalForDb.__boutiqueDb = createDatabase(url).catch((err) => {
      globalForDb.__boutiqueDb = undefined;
      throw err;
    });
  }
  const db = await globalForDb.__boutiqueDb;
  await ensureArrivalsSchema(db);
  return db;
}

export type { Database, Tx } from "./client";

