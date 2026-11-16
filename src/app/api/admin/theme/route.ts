import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import { getDb } from "@/db";
import { themes, themeSections, themeVersions } from "@/db/schema";
import { parseThemeSettings, parseSnapshot, sectionSchemas, type SectionType } from "@/lib/theme/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  const db = await getDb();
  let [theme] = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);

  if (!theme) {
    return NextResponse.json({ success: false, error: "Thème non trouvé" }, { status: 404 });
  }

  const sections = await db.select().from(themeSections).where(eq(themeSections.themeId, theme.id)).orderBy(themeSections.position);
  const versions = await db.select().from(themeVersions).where(eq(themeVersions.themeId, theme.id)).orderBy(desc(themeVersions.version));

  return NextResponse.json({
    success: true,
    theme,
    sections,
    versions,
  });
}

export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const db = await getDb();
    let [theme] = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);

    if (!theme) {
      return NextResponse.json({ success: false, error: "Thème introuvable" }, { status: 404 });
    }

    // 1. Sauvegarde des réglages globaux du brouillon
    if (body.settings) {
      const parsedSettings = parseThemeSettings(body.settings);
      await db
        .update(themes)
        .set({
          draftSettings: parsedSettings,
          draftUpdatedAt: new Date(),
        })
        .where(eq(themes.id, theme.id));
    }

    // 2. Sauvegarde des sections du brouillon
    if (Array.isArray(body.sections)) {
      await db.delete(themeSections).where(eq(themeSections.themeId, theme.id));

      for (let i = 0; i < body.sections.length; i++) {
        const sec = body.sections[i];
        await db.insert(themeSections).values({
          id: sec.id || crypto.randomUUID(),
          themeId: theme.id,
          type: sec.type,
          position: i,
          isEnabled: sec.isEnabled !== false,
          settings: sec.settings || {},
        });
      }
    }

    invalidateCache("theme:");
    await logAudit(admin.user.id, "update_theme_draft", "themes", theme.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur mise à jour thème brouillon :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const db = await getDb();
    const [theme] = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);
    if (!theme) return NextResponse.json({ success: false, error: "Thème introuvable" }, { status: 404 });

    // ACTION : PUBLIER LE BROUILLON
    if (body.action === "publish") {
      const currentSections = await db
        .select()
        .from(themeSections)
        .where(eq(themeSections.themeId, theme.id))
        .orderBy(themeSections.position);

      const snapshot = parseSnapshot({
        settings: theme.draftSettings,
        sections: currentSections,
      });

      // Trouver le prochain numéro de version
      const [lastVer] = await db
        .select({ version: themeVersions.version })
        .from(themeVersions)
        .where(eq(themeVersions.themeId, theme.id))
        .orderBy(desc(themeVersions.version))
        .limit(1);

      const nextVersion = (lastVer?.version || 0) + 1;

      let versionId = "";
      await db.transaction(async (tx) => {
        const [v] = await tx
          .insert(themeVersions)
          .values({
            themeId: theme.id,
            version: nextVersion,
            snapshot,
            note: body.note?.trim() || `Publication v${nextVersion}`,
            adminUserId: admin.user.id,
          })
          .returning({ id: themeVersions.id });

        versionId = v.id;

        await tx
          .update(themes)
          .set({ publishedVersionId: v.id })
          .where(eq(themes.id, theme.id));
      });

      invalidateCache("theme:");
      await logAudit(admin.user.id, "publish_theme", "theme_versions", versionId, { version: nextVersion });
      return NextResponse.json({ success: true, version: nextVersion });
    }

    // ACTION : RESTAURER UNE VERSION ANTÉRIEURE
    if (body.action === "restore" && body.versionId) {
      const [v] = await db
        .select()
        .from(themeVersions)
        .where(eq(themeVersions.id, body.versionId))
        .limit(1);

      if (!v || !v.snapshot) {
        return NextResponse.json({ success: false, error: "Version introuvable" }, { status: 404 });
      }

      const snap = parseSnapshot(v.snapshot);

      await db.transaction(async (tx) => {
        await tx
          .update(themes)
          .set({
            draftSettings: snap.settings,
            draftUpdatedAt: new Date(),
          })
          .where(eq(themes.id, theme.id));

        await tx.delete(themeSections).where(eq(themeSections.themeId, theme.id));

        for (let i = 0; i < snap.sections.length; i++) {
          const s = snap.sections[i];
          await tx.insert(themeSections).values({
            id: s.id,
            themeId: theme.id,
            type: s.type,
            position: i,
            isEnabled: s.isEnabled,
            settings: s.settings,
          });
        }
      });

      invalidateCache("theme:");
      await logAudit(admin.user.id, "restore_theme_version", "theme_versions", body.versionId, { version: v.version });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Action non reconnue" }, { status: 400 });
  } catch (err) {
    console.error("Erreur publication thème :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

