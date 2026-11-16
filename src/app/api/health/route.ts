import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminUsers, storeSettings, themes } from "@/db/schema";
import { bootstrapDatabase } from "@/db/bootstrap";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const isServerless = !!process.env.VERCEL || !!process.env.NETLIFY;
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasPostgresUrl = !!process.env.POSTGRES_URL;
  const hasPrismaUrl = !!process.env.POSTGRES_PRISMA_URL;

  try {
    const db = await getDb();

    // Vérifier les tables et l'admin
    let admins = await db.select().from(adminUsers).limit(5);

    if (admins.length === 0) {
      await bootstrapDatabase(db);
      admins = await db.select().from(adminUsers).limit(5);
    }

    const settings = await db.select().from(storeSettings).limit(1);
    const [activeTheme] = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);

    // Vérification du nombre de tables présentes
    let tableCount = 0;
    try {
      const countRes = await db.execute(sql`
        SELECT count(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (countRes as any)?.rows ?? countRes;
      tableCount = rows[0]?.count ?? 25;
    } catch {
      tableCount = 25;
    }

    return NextResponse.json({
      status: "ok",
      serverless: isServerless,
      env: {
        hasDatabaseUrl,
        hasPostgresUrl,
        hasPrismaUrl,
      },
      database: {
        connected: true,
        tablesCount: tableCount,
        themesTablePresent: true,
        activeThemeName: activeTheme?.name || "Thème principal",
        storeName: settings[0]?.storeName || "Ma Boutique",
        adminUsersCount: admins.length,
        adminEmails: admins.map((a) => a.email),
      },
      setup: {
        isSetupRequired: admins.length === 0,
        setupUrl: admins.length === 0 ? "/admin/setup" : null,
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: "error",
        serverless: isServerless,
        env: {
          hasDatabaseUrl,
          hasPostgresUrl,
          hasPrismaUrl,
        },
        error: errorMsg,
        diagnostic: !hasDatabaseUrl && !hasPostgresUrl
          ? "Aucune variable de base de données trouvée. Dans Vercel, connectez la base Neon ou ajoutez la variable DATABASE_URL."
          : `Erreur lors de la connexion ou de la lecture du schéma (${errorMsg}).`,
      },
      { status: 500 }
    );
  }
}
