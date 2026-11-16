import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import { getDb } from "@/db";
import { storeSettings } from "@/db/schema";
import { isValidWhatsappNumber, normalizeWhatsappNumber } from "@/lib/phone";
import { eq } from "drizzle-orm";
import { z } from "zod";

const settingsSchema = z.object({
  storeName: z.string().max(100).default(""),
  tagline: z.string().max(200).default(""),
  logoKey: z.string().nullable().optional(),
  faviconKey: z.string().nullable().optional(),
  phone: z.string().max(50).default(""),
  whatsappNumber: z.string().max(25).default(""),
  email: z.string().max(100).default(""),
  address: z.string().max(200).default(""),
  country: z.string().max(100).default(""),
  currency: z.string().min(1).max(10).default("XOF"),
  timezone: z.string().max(50).default("Africa/Abidjan"),
  locale: z.string().max(10).default("fr-FR"),
  socialLinks: z.record(z.string()).default({}),
  ordersEnabled: z.boolean().default(false),
  lowStockThreshold: z.coerce.number().int().min(1).max(100).default(3),
});

export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = parsed.data;

    // Règle stricte du cahier des charges :
    // "Le numéro WhatsApp doit être obligatoire avant l'activation du système de commande."
    if (data.ordersEnabled) {
      if (!data.whatsappNumber || data.whatsappNumber.trim() === "") {
        return NextResponse.json(
          { success: false, error: "Vous devez configurer votre numéro WhatsApp avant d'activer la prise de commande." },
          { status: 400 }
        );
      }
      if (!isValidWhatsappNumber(data.whatsappNumber)) {
        return NextResponse.json(
          {
            success: false,
            error: "Le numéro WhatsApp doit être au format international sans espace (ex : 2250700000000).",
          },
          { status: 400 }
        );
      }
    }

    const cleanWhatsapp = data.whatsappNumber ? normalizeWhatsappNumber(data.whatsappNumber) : "";

    const db = await getDb();
    await db
      .update(storeSettings)
      .set({
        ...data,
        whatsappNumber: cleanWhatsapp,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, 1));

    invalidateCache();
    await logAudit(admin.user.id, "update_settings", "store_settings", "1", data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur mise à jour paramètres :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

