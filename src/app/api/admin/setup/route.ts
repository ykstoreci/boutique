import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminUsers, storeSettings, themes, themeSections, pages } from "@/db/schema";
import { hashPassword, createSession, setSessionCookie, logAudit } from "@/lib/auth";
import { DEFAULT_THEME_SETTINGS, INITIAL_SECTIONS } from "@/lib/theme/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const setupSchema = z.object({
  name: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères"),
});

export async function GET() {
  try {
    const db = await getDb();
    const [existingAdmin] = await db.select().from(adminUsers).limit(1);
    return NextResponse.json({
      success: true,
      isSetupRequired: !existingAdmin,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, isSetupRequired: false, error: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const db = await getDb();

    // 1. VÉRIFICATION STRICTE DE SÉCURITÉ : Ne permettre l'initialisation QUE s'il n'y a AUCUN administrateur
    const existingAdmins = await db.select().from(adminUsers).limit(1);
    if (existingAdmins.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Un administrateur existe déjà. La procédure d'initialisation est définitivement verrouillée.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();

    // 2. Hachage sécurisé bcrypt (coût 12)
    const passwordHash = await hashPassword(password);

    // 3. Insertion du propriétaire
    const [user] = await db
      .insert(adminUsers)
      .values({
        email: cleanEmail,
        name: name.trim(),
        passwordHash,
      })
      .returning();

    // 4. Initialisation des réglages essentiels si absents
    const existingSettings = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
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

    // 5. Initialisation du thème si absent
    const activeThemes = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);
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

    // 6. Création de la session sécurisée et cookie
    const rawToken = await createSession(user.id, { userAgent, ip });
    await setSessionCookie(rawToken);

    await logAudit(user.id, "initial_setup", "admin_users", user.id, { ip, userAgent }, ip);

    return NextResponse.json({
      success: true,
      message: "Compte propriétaire initialisé avec succès !",
      redirect: "/admin",
    });
  } catch (err) {
    console.error("Erreur setup admin :", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Erreur lors de l'initialisation : ${msg}` },
      { status: 500 }
    );
  }
}

