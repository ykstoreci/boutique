import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  deviceLabel: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = subSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Abonnement invalide" }, { status: 400 });
    }

    const { endpoint, keys, deviceLabel } = parsed.data;
    const userAgent = req.headers.get("user-agent") || undefined;
    const db = await getDb();

    // Vérifier si l'endpoint existe déjà
    const [existing] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .limit(1);

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({
          p256dh: keys.p256dh,
          auth: keys.auth,
          isActive: true,
          failureCount: 0,
          deviceLabel: deviceLabel || existing.deviceLabel,
          userAgent: userAgent || existing.userAgent,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existing.id));
    } else {
      await db.insert(pushSubscriptions).values({
        adminUserId: admin.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        deviceLabel: deviceLabel || "iPhone / Mobile",
        userAgent: userAgent || null,
        isActive: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur enregistrement push subscription :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

