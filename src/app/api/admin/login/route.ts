import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminUsers, loginAttempts } from "@/db/schema";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  checkLoginRateLimit,
  recordLoginAttempt,
  logAudit,
} from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function POST(req: NextRequest) {
  // En développement local uniquement : accès direct sans mot de passe
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ success: true, redirect: "/admin" });
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Email ou mot de passe invalide." }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();
    const rateLimitKey = `login:${ip}:${cleanEmail}`;

    // Vérifier la limitation de débit (anti-bruteforce)
    const allowed = await checkLoginRateLimit(rateLimitKey, 10, 15);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Trop de tentatives infructueuses. Veuillez patienter 15 minutes." },
        { status: 429 }
      );
    }

    const db = await getDb();
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(sql`lower(${adminUsers.email}) = lower(${cleanEmail})`)
      .limit(1);

    if (!user) {
      await recordLoginAttempt(rateLimitKey, false);
      return NextResponse.json({ success: false, error: "Identifiants incorrects." }, { status: 401 });
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      await recordLoginAttempt(rateLimitKey, false);
      return NextResponse.json({ success: false, error: "Identifiants incorrects." }, { status: 401 });
    }

    // Connexion réussie : effacer les tentatives antérieures
    await db.delete(loginAttempts).where(eq(loginAttempts.key, rateLimitKey));
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsers.id, user.id));

    const rawToken = await createSession(user.id, { userAgent, ip });
    await setSessionCookie(rawToken);

    await logAudit(user.id, "login", "admin_users", user.id, { ip, userAgent }, ip);

    return NextResponse.json({ success: true, redirect: "/admin" });
  } catch (err) {
    console.error("Erreur login admin :", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Erreur serveur lors de la connexion : ${msg}` },
      { status: 500 }
    );
  }
}
