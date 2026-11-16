import bcrypt from "bcryptjs";
import { adminUsers, storeSettings, themes, themeSections, pages } from "./schema";
import { DEFAULT_THEME_SETTINGS, INITIAL_SECTIONS } from "@/lib/theme/schema";
import { eq } from "drizzle-orm";
import type { Database } from "./client";

/**
 * Initialise les structures et comptes essentiels lors du premier démarrage
 * (particulièrement utile sur Netlify lors du branchement d'une nouvelle base Postgres).
 */
export async function bootstrapDatabase(db: Database): Promise<void> {
  try {
    // 1. Initialiser storeSettings (singleton id: 1)
    const existingSettings = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 1))
      .limit(1);

    if (existingSettings.length === 0) {
      await db.insert(storeSettings).values({
        id: 1,
        storeName: "Ma Boutique",
        tagline: "",
        currency: "XOF",
        locale: "fr-FR",
        timezone: "Africa/Abidjan",
        ordersEnabled: true,
      });
    }

    // 2. Initialiser le thème principal et ses sections
    const activeThemes = await db
      .select()
      .from(themes)
      .where(eq(themes.isActive, true))
      .limit(1);

    if (activeThemes.length === 0) {
      const [theme] = await db
        .insert(themes)
        .values({
          name: "Thème principal",
          isActive: true,
          draftSettings: DEFAULT_THEME_SETTINGS,
        })
        .returning({ id: themes.id });

      for (let i = 0; i < INITIAL_SECTIONS.length; i++) {
        await db.insert(themeSections).values({
          themeId: theme.id,
          type: INITIAL_SECTIONS[i],
          position: i,
          isEnabled: true,
          settings: {},
        });
      }
    }

    // 3. Initialiser les pages système (vierges de faux contenu)
    const systemPages = [
      { slug: "presentation", title: "Présentation de la boutique" },
      { slug: "conditions-generales", title: "Conditions Générales de Vente" },
      { slug: "politique-de-confidentialite", title: "Politique de Confidentialité" },
      { slug: "contact", title: "Contact" },
    ];

    for (const page of systemPages) {
      const [existingPage] = await db
        .select()
        .from(pages)
        .where(eq(pages.slug, page.slug))
        .limit(1);

      if (!existingPage) {
        await db.insert(pages).values({
          slug: page.slug,
          title: page.title,
          content: "",
          isPublished: true,
          isSystem: true,
          showInFooter: true,
        });
      }
    }

    // 4. Initialiser le compte propriétaire :
    // - En développement local : accès libre direct (compte local par défaut)
    // - En production : uniquement si INITIAL_ADMIN_EMAIL et INITIAL_ADMIN_PASSWORD sont définis (sinon /admin/setup)
    const allAdmins = await db.select().from(adminUsers).limit(1);
    if (allAdmins.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        await db.insert(adminUsers).values({
          id: "00000000-0000-0000-0000-000000000000",
          email: "admin@boutique.local",
          name: "Propriétaire",
          passwordHash: "local-dev-access",
        });
      } else if (process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD) {
        const email = process.env.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
        const password = process.env.INITIAL_ADMIN_PASSWORD;
        const name = process.env.INITIAL_ADMIN_NAME?.trim() || "Propriétaire";
        const passwordHash = await bcrypt.hash(password, 12);

        await db.insert(adminUsers).values({
          email,
          name,
          passwordHash,
        });
      }
    }
  } catch (err) {
    console.error("Erreur bootstrap database :", err);
  }
}

