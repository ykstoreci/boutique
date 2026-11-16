/**
 * Fabrique de connexion partagée entre l'application et les scripts CLI
 * (sans dépendance à `server-only`).
 */
import path from "node:path";
import fs from "node:fs/promises";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "./schema";

type Schema = typeof schema;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = PgDatabase<PgQueryResultHKT, Schema> & { $close?: () => Promise<void> } & Record<string, any>;
export type Tx = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export async function createDatabase(url: string | undefined, opts: { migrate?: boolean; bootstrap?: boolean } = {}): Promise<Database> {
  const isServerless = !!process.env.NETLIFY || !!process.env.VERCEL;
  const rawUrl =
    url?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim();

  if (isServerless && !rawUrl) {
    console.warn(
      "[Database] ATTENTION: Aucune variable DATABASE_URL ou SUPABASE_DB_URL n'est définie dans l'environnement serverless."
    );
  }

  const defaultUrl = isServerless ? "pglite:memory" : "pglite:./storage/pgdata";
  const databaseUrl = rawUrl || defaultUrl;
  const isPglite = databaseUrl.startsWith("pglite:");

  if (isPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const target = databaseUrl.slice("pglite:".length);
    if (target !== "memory") {
      await fs.mkdir(path.resolve(process.cwd(), target), { recursive: true });
    }
    try {
      const client = target === "memory" ? new PGlite() : new PGlite(path.resolve(process.cwd(), target));
      await client.waitReady;
      const db = drizzle(client, { schema }) as unknown as Database;
      db.$close = () => client.close();
      // En développement, la base embarquée est toujours mise à jour automatiquement.
      if (opts.migrate !== false) {
        try {
          const { migrate } = await import("drizzle-orm/pglite/migrator");
          await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER });
        } catch {
          const { runEmbeddedMigrations } = await import("./embedded-sql");
          await runEmbeddedMigrations(db);
        }
        if (opts.bootstrap !== false && target !== "memory") {
          const { bootstrapDatabase } = await import("./bootstrap");
          await bootstrapDatabase(db);
        }
      }
      return db;
    } catch (err) {
      console.warn("Avertissement: PGlite indisponible dans ce thread/contexte :", err);
      const fallbackClient = new PGlite();
      await fallbackClient.waitReady;
      const db = drizzle(fallbackClient, { schema }) as unknown as Database;
      db.$close = () => fallbackClient.close();
      return db;
    }
  }

  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const isRemote = !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
  // Nettoyer sslmode=require pour éviter que pg-connection-string n'écrase rejectUnauthorized: false sur Supabase Pooler
  const cleanConnString = isRemote
    ? databaseUrl.replace(/([?&])sslmode=[^&]+(&?)/i, (_, p1, p2) => (p2 ? p1 : "")).replace(/[?&]$/, "")
    : databaseUrl;

  const pool = new Pool({
    connectionString: cleanConnString,
    max: Number(process.env.DATABASE_POOL_MAX ?? (isServerless ? 5 : 10)),
    ssl: process.env.DATABASE_SSL === "true" || isRemote ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool, { schema }) as unknown as Database;
  db.$close = () => pool.end();

  // Vérification active : si la table "themes" est absente dans PostgreSQL, migrer et initialiser immédiatement
  try {
    const checkRes = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'themes');"
    );
    const themesExists = Boolean(checkRes.rows[0]?.exists);
    if (!themesExists) {
      console.log("[Database] Table 'themes' absente. Exécution immédiate des migrations de production...");
      try {
        const { migrate } = await import("drizzle-orm/node-postgres/migrator");
        await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER });
      } catch (migErr) {
        console.warn("[Database] Migration disque non disponible, utilisation des migrations intégrées :", migErr);
        const { runEmbeddedMigrations } = await import("./embedded-sql");
        await runEmbeddedMigrations(db);
      }
      if (opts.bootstrap !== false) {
        const { bootstrapDatabase } = await import("./bootstrap");
        await bootstrapDatabase(db);
      }
      console.log("[Database] Migrations et bootstrap initialisés avec succès.");
      return db;
    }
  } catch (checkErr) {
    console.warn("[Database] Impossible de vérifier l'existence de la table 'themes' :", checkErr);
  }

  const shouldMigrate = opts.migrate === true || (opts.migrate !== false && (process.env.AUTO_MIGRATE === "true" || (isServerless && process.env.AUTO_MIGRATE !== "false")));
  if (shouldMigrate) {
    try {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER });
    } catch (migErr) {
      console.warn("[Database] Migration via dossier disque échouée ou absente, exécution des migrations intégrées :", migErr);
      const { runEmbeddedMigrations } = await import("./embedded-sql");
      await runEmbeddedMigrations(db);
    }
    if (opts.bootstrap !== false) {
      const { bootstrapDatabase } = await import("./bootstrap");
      await bootstrapDatabase(db);
    }
  }
  return db;
}

