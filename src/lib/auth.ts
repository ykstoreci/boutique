import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { eq, and, gt, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { cachedQuery } from "@/lib/cache";
import { adminUsers, adminSessions, loginAttempts, auditLogs } from "@/db/schema";

const SESSION_COOKIE_NAME = "btq_admin_session";
const SESSION_DURATION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  adminUserId: string,
  reqInfo?: { userAgent?: string; ip?: string }
): Promise<string> {
  const db = await getDb();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);

  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(adminSessions).values({
    id: tokenHash,
    adminUserId,
    expiresAt,
    userAgent: reqInfo?.userAgent?.slice(0, 500) || null,
    ip: reqInfo?.ip?.slice(0, 45) || null,
  });

  return rawToken;
}

export async function validateSession(rawToken: string) {
  if (!rawToken || rawToken.length < 32) return null;
  const db = await getDb();
  const tokenHash = hashSessionToken(rawToken);

  const rows = await db
    .select({
      session: adminSessions,
      user: adminUsers,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(and(eq(adminSessions.id, tokenHash), gt(adminSessions.expiresAt, new Date())))
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0];
}

export async function destroySession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const db = await getDb();
  const tokenHash = hashSessionToken(rawToken);
  await db.delete(adminSessions).where(eq(adminSessions.id, tokenHash));
}

export const DEFAULT_OWNER_ID = "00000000-0000-0000-0000-000000000000";

export const DEFAULT_OWNER = {
  user: {
    id: DEFAULT_OWNER_ID,
    name: "Propriétaire",
    email: "admin@boutique.local",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  },
  session: {
    id: "open-access-session",
    adminUserId: DEFAULT_OWNER_ID,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    userAgent: null,
    ip: null,
    createdAt: new Date(),
  },
};

/**
 * Récupère l'utilisateur administrateur actuellement connecté.
 *
 * - En développement local (NODE_ENV !== "production") :
 *   Accès direct et transparent sans identifiant ni mot de passe.
 *
 * - En production (NODE_ENV === "production") :
 *   Sécurité stricte obligatoire. Vérification cryptographique de la session
 *   et rejet systématique (null) si aucune session valide n'est trouvée.
 */
export async function getCurrentAdmin() {
  if (process.env.NODE_ENV !== "production") {
    return cachedQuery("dev:admin", 60_000, async () => {
      try {
        const db = await getDb();
        const [user] = await db.select().from(adminUsers).limit(1);
        if (user) {
          return {
            user,
            session: {
              id: "dev-local-session",
              adminUserId: user.id,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              userAgent: "local-dev",
              ip: "127.0.0.1",
              createdAt: new Date(),
            },
          };
        }
      } catch {}
      return DEFAULT_OWNER;
    });
  }

  // En production : vérification stricte du jeton de session dans la base
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return validateSession(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(rawToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await destroySession(token);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Limitation des tentatives de connexion pour contrer le bruteforce.
 * Autorise max 5 échecs consécutifs sur 15 minutes par clé (ex. IP + email).
 */
export async function checkLoginRateLimit(key: string, maxAttempts = 5, windowMinutes = 15): Promise<boolean> {
  const db = await getDb();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const recentAttempts = await db
    .select()
    .from(loginAttempts)
    .where(and(eq(loginAttempts.key, key), gt(loginAttempts.createdAt, windowStart)))
    .orderBy(desc(loginAttempts.createdAt))
    .limit(maxAttempts);

  const failedAttempts = recentAttempts.filter((a) => !a.success);
  return failedAttempts.length < maxAttempts;
}

export async function recordLoginAttempt(key: string, success: boolean) {
  const db = await getDb();
  await db.insert(loginAttempts).values({
    key,
    success,
  });
}

export async function logAudit(
  adminUserId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: unknown,
  ip?: string
) {
  try {
    const db = await getDb();
    await db.insert(auditLogs).values({
      adminUserId,
      action,
      entity,
      entityId: entityId || null,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
      ip: ip || null,
    });
  } catch (err) {
    console.error("Échec d'enregistrement de l'audit log :", err);
  }
}

