import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { getDb } from "@/db";
import { shippingZones, storeSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["delivery", "shipping"]),
  name: z.string().min(1).max(100),
  fee: z.coerce.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
  position: z.coerce.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const parsed = zoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Données invalides" }, { status: 400 });
    }

    const data = parsed.data;
    const db = await getDb();

    const [created] = await db
      .insert(shippingZones)
      .values({
        type: data.type,
        name: data.name.trim(),
        fee: data.fee !== undefined ? data.fee : null,
        isActive: data.isActive,
        position: data.position,
      })
      .returning();

    await logAudit(admin.user.id, "create_shipping_zone", "shipping_zones", created.id, { name: created.name });
    return NextResponse.json({ success: true, zone: created });
  } catch (err) {
    console.error("Erreur création zone :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID requis." }, { status: 400 });

    const db = await getDb();
    await db.delete(shippingZones).where(eq(shippingZones.id, id));

    await logAudit(admin.user.id, "delete_shipping_zone", "shipping_zones", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression zone :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

const updateDefaultsSchema = z.object({
  deliveryEnabled: z.boolean().optional(),
  shippingEnabled: z.boolean().optional(),
  defaultDeliveryFee: z.coerce.number().int().min(0).nullable().optional(),
  defaultShippingFee: z.coerce.number().int().min(0).nullable().optional(),
  deliveryInfo: z.string().max(2000).optional(),
});

export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateDefaultsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Données invalides." }, { status: 400 });
    }

    const db = await getDb();
    await db
      .update(storeSettings)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, 1));

    await logAudit(admin.user.id, "update_shipping_settings", "store_settings", "1", parsed.data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur mise à jour paramètres livraison :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

