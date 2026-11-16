import "dotenv/config";
import { createDatabase } from "../src/db/client";
import { storeSettings, themes, themeSections, pages } from "../src/db/schema";
import { DEFAULT_THEME_SETTINGS, INITIAL_SECTIONS } from "../src/lib/theme/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== EXÉCUTION DES MIGRATIONS ===");
  const db = await createDatabase(process.env.DATABASE_URL, { migrate: true });
  console.log("Schéma appliqué avec succès.");

  // Vérifier et initialiser les paramètres par défaut (singleton id: 1)
  const existingSettings = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, 1))
    .limit(1);

  if (existingSettings.length === 0) {
    await db.insert(storeSettings).values({
      id: 1,
      storeName: "",
      tagline: "",
      currency: "XOF",
      locale: "fr-FR",
      timezone: "Africa/Abidjan",
      ordersEnabled: false, // désactivé jusqu'à ce que le propriétaire configure son numéro WhatsApp
    });
    console.log("Paramètres de la boutique initialisés.");
  }

  // Vérifier et initialiser le thème par défaut
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

    // Insérer les sections initiales
    for (let i = 0; i < INITIAL_SECTIONS.length; i++) {
      const type = INITIAL_SECTIONS[i];
      await db.insert(themeSections).values({
        themeId: theme.id,
        type,
        position: i,
        isEnabled: true,
        settings: {},
      });
    }
    console.log("Thème par défaut et sections initialisés.");
  }

  // Vérifier et initialiser les pages système (vides de faux contenu, prêtes pour le propriétaire)
  const systemPages = [
    { slug: "presentation", title: "Présentation de la boutique" },
    { slug: "conditions-generales", title: "Conditions Générales de Vente" },
    { slug: "politique-de-confidentialite", title: "Politique de Confidentialité" },
    { slug: "contact", title: "Contact" },
  ];

  for (const page of systemPages) {
    const exists = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, page.slug))
      .limit(1);

    if (exists.length === 0) {
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

  console.log("Initialisation terminée avec succès.");
  if (db.$close) await db.$close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur de migration :", err);
  process.exit(1);
});

