import { getDb } from "@/db";
import { cachedQuery } from "@/lib/cache";
import { themes, themeVersions, themeSections } from "@/db/schema";
import { DEFAULT_THEME_SETTINGS, FONT_OPTIONS, parseSnapshot, parseThemeSettings, type ThemeSettings, type ThemeSnapshot } from "./schema";
import { eq, desc } from "drizzle-orm";

/**
 * Récupère le snapshot actif du thème pour la boutique publique (mis en cache RAM < 1ms) :
 *  - Si une version publiée existe, on utilise son snapshot figé
 *  - Sinon, on prend les réglages et sections brouillon
 */
export async function getPublishedTheme(): Promise<ThemeSnapshot> {
  return cachedQuery("theme:published", 30_000, async () => {
    try {
      const db = await getDb();
      const [theme] = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);
      if (!theme) {
        return { settings: DEFAULT_THEME_SETTINGS, sections: [] };
      }

      if (theme.publishedVersionId) {
        const [v] = await db
          .select()
          .from(themeVersions)
          .where(eq(themeVersions.id, theme.publishedVersionId))
          .limit(1);

        if (v && v.snapshot) {
          return parseSnapshot(v.snapshot);
        }
      }

      // Récupérer la dernière version publiée s'il en existe une
      const [latestPublished] = await db
        .select()
        .from(themeVersions)
        .where(eq(themeVersions.themeId, theme.id))
        .orderBy(desc(themeVersions.version))
        .limit(1);

      if (latestPublished && latestPublished.snapshot) {
        return parseSnapshot(latestPublished.snapshot);
      }

      // Sinon, repli sur le brouillon et ses sections
      const rawSections = await db
        .select()
        .from(themeSections)
        .where(eq(themeSections.themeId, theme.id))
        .orderBy(themeSections.position);

      return parseSnapshot({
        settings: theme.draftSettings,
        sections: rawSections,
      });
    } catch (err) {
      console.error("Erreur de récupération du thème publié :", err);
      return { settings: DEFAULT_THEME_SETTINGS, sections: [] };
    }
  });
}

/**
 * Récupère le snapshot brouillon complet pour l'éditeur et la prévisualisation dans l'administration.
 */
export async function getDraftTheme(): Promise<{
  themeId: string;
  snapshot: ThemeSnapshot;
}> {
  return cachedQuery("theme:draft", 10_000, async () => {
    const db = await getDb();
    let [theme] = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);

    if (!theme) {
      const [created] = await db
        .insert(themes)
        .values({
          name: "Thème principal",
          isActive: true,
          draftSettings: DEFAULT_THEME_SETTINGS,
        })
        .returning();
      theme = created;
    }

    const rawSections = await db
      .select()
      .from(themeSections)
      .where(eq(themeSections.themeId, theme.id))
      .orderBy(themeSections.position);

    const snapshot = parseSnapshot({
      settings: theme.draftSettings,
      sections: rawSections,
    });

    return {
      themeId: theme.id,
      snapshot,
    };
  });
}

export function fontStackFor(value: string): string {
  const found = FONT_OPTIONS.find((f) => f.value === value);
  return found ? found.stack : "system-ui, -apple-system, sans-serif";
}

/**
 * Génère le bloc de variables CSS à injecter dans le `<head>` ou sur la balise `<html>`.
 */
export function generateThemeCssVariables(settings: ThemeSettings): string {
  const c = settings.colors;
  const s = settings.shape;
  const t = settings.typography;

  return `
    --theme-primary: ${c.primary};
    --theme-primary-text: ${c.primaryText};
    --theme-secondary: ${c.secondary};
    --theme-background: ${c.background};
    --theme-surface: ${c.surface};
    --theme-text: ${c.text};
    --theme-muted: ${c.muted};
    --theme-border: ${c.border};
    --theme-price: ${c.price};
    --theme-sale: ${c.sale};

    --theme-radius-btn: ${s.buttonRadius}px;
    --theme-radius-card: ${s.cardRadius}px;
    --theme-radius-input: ${s.inputRadius}px;
    --theme-border-width: ${s.borderWidth}px;

    --theme-font-heading: ${fontStackFor(t.headingFont)};
    --theme-font-body: ${fontStackFor(t.bodyFont)};
    --theme-font-base: ${t.baseSize}px;
    --theme-heading-weight: ${t.headingWeight};
  `;
}
