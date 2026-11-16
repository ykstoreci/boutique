import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import path from "node:path";
import * as schema from "../src/db/schema";
import { bootstrapDatabase } from "../src/db/bootstrap";
import { runEmbeddedMigrations } from "../src/db/embedded-sql";
import type { Database } from "../src/db/client";

const EXPECTED_TABLES = [
  "admin_sessions",
  "admin_users",
  "audit_logs",
  "categories",
  "customers",
  "delivery_addresses",
  "login_attempts",
  "notifications",
  "order_items",
  "order_status_history",
  "orders",
  "pages",
  "product_images",
  "product_relations",
  "product_variants",
  "products",
  "push_deliveries",
  "push_subscriptions",
  "rate_limits",
  "shipping_zones",
  "stock_arrival_items",
  "stock_arrivals",
  "stock_movements",
  "store_settings",
  "theme_sections",
  "theme_versions",
  "themes",
];

async function run() {
  const rawConn =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim();

  if (!rawConn || rawConn.startsWith("pglite:")) {
    console.error("ERREUR: Aucune chaîne de connexion PostgreSQL de production (Supabase) fournie.");
    console.error("Veuillez définir DATABASE_URL ou SUPABASE_DB_URL vers votre instance Supabase PostgreSQL.");
    process.exit(1);
  }

  const isRemote = !rawConn.includes("localhost") && !rawConn.includes("127.0.0.1");
  const connectionString = isRemote
    ? rawConn.replace(/([?&])sslmode=[^&]+(&?)/i, (_, p1, p2) => (p2 ? p1 : "")).replace(/[?&]$/, "")
    : rawConn;

  console.log("=== VÉRIFICATION ET MIGRATION SUPABASE POSTGRESQL PRODUCTION ===");
  const masked = connectionString.replace(/:([^@]+)@/, ":****@");
  console.log("Cible :", masked);

  const pool = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // 1. Tester la connexion
    const timeRes = await pool.query("SELECT NOW() as current_time, current_database() as db_name;");
    console.log("Connexion réussie. Base :", timeRes.rows[0].db_name, "| Heure serveur :", timeRes.rows[0].current_time);

    // 2. Inventaire des tables existantes (sauvegarde / sécurité)
    const existingRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const existingTableNames: string[] = existingRes.rows.map((r) => r.table_name);
    console.log(`Tables existantes détectées : ${existingTableNames.length}`);

    // Si des tables existent déjà, compter les enregistrements pour vérification
    if (existingTableNames.length > 0) {
      console.log("Inventaire des données existantes (aucune suppression ne sera effectuée) :");
      for (const t of existingTableNames) {
        try {
          const countRes = await pool.query(`SELECT count(*)::int as count FROM "${t}";`);
          console.log(`  - ${t}: ${countRes.rows[0].count} lignes`);
        } catch {
          // ignorer
        }
      }
    }

    const db = drizzle(pool, { schema }) as unknown as Database;

    // 3. Appliquer les migrations
    console.log("\nApplication des migrations Drizzle...");
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    try {
      await migrate(db as never, { migrationsFolder });
      console.log("Migrations standard Drizzle appliquées avec succès.");
    } catch (migErr) {
      console.warn("Drizzle disk migrator a rencontré une exception, application des migrations SQL intégrées :", migErr);
      await runEmbeddedMigrations(db);
      console.log("Migrations SQL intégrées appliquées avec succès.");
    }

    // 4. Initialisation des données requises (Bootstrap non destructif)
    console.log("\nInitialisation des structures requises (Bootstrap non destructif)...");
    await bootstrapDatabase(db);
    console.log("Bootstrap terminé.");

    // 5. Vérification complète de toutes les tables attendues
    console.log("\n=== VÉRIFICATION DU SCHÉMA DE PRODUCTION ===");
    const afterRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const finalTables = new Set(afterRes.rows.map((r) => r.table_name));

    let allOk = true;
    for (const t of EXPECTED_TABLES) {
      if (finalTables.has(t)) {
        const countRes = await pool.query(`SELECT count(*)::int as count FROM "${t}";`);
        console.log(`  [OK] Table "${t}" présente (${countRes.rows[0].count} lignes)`);
      } else {
        console.error(`  [MANQUANT] Table "${t}" absente !`);
        allOk = false;
      }
    }

    // Vérification spécifique du thème
    const themeRes = await pool.query(`SELECT id, name, is_active FROM "themes" WHERE is_active = true LIMIT 1;`);
    if (themeRes.rows.length > 0) {
      console.log(`\n  [OK] Thème actif : "${themeRes.rows[0].name}" (ID: ${themeRes.rows[0].id})`);
    } else {
      console.error("\n  [ATTENTION] Aucun thème actif trouvé.");
      allOk = false;
    }

    // Vérification de l'administrateur
    const adminRes = await pool.query(`SELECT id, email, name FROM "admin_users" LIMIT 5;`);
    console.log(`  [OK] Administrateurs enregistrés (${adminRes.rows.length}) :`, adminRes.rows.map((a) => a.email).join(", "));

    if (allOk) {
      console.log("\n✅ SUCCÈS : Toutes les 25 tables de production sont présentes et prêtes !");
    } else {
      console.error("\n❌ ATTENTION : Certaines tables manquent.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Erreur fatale lors de la migration :", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

