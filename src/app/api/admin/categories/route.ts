import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { eq, ne } from "drizzle-orm";
import { z } from "zod";

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nom requis").max(100),
  slug: z.string().max(100).optional(),
  description: z.string().default(""),
  imageKey: z.string().nullable().optional(),
  isPublished: z.boolean().default(true),
  position: z.coerce.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = parsed.data;
    const db = await getDb();

    let finalSlug = data.slug && data.slug.trim() !== "" ? slugify(data.slug) : slugify(data.name);
    let counter = 1;
    const baseSlug = finalSlug;
    while (true) {
      const [duplicate] = await db.select().from(categories).where(eq(categories.slug, finalSlug)).limit(1);
      if (!duplicate) break;
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    const [created] = await db
      .insert(categories)
      .values({
        name: data.name.trim(),
        slug: finalSlug,
        description: data.description.trim(),
        imageKey: data.imageKey || null,
        isPublished: data.isPublished,
        position: data.position,
      })
      .returning();

    invalidateCache("store:");
    invalidateCache("admin:categories");
    await logAudit(admin.user.id, "create_category", "categories", created.id, { name: created.name });
    return NextResponse.json({ success: true, category: created });
  } catch (err) {
    console.error("Erreur création catégorie :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ success: false, error: "ID de catégorie requis." }, { status: 400 });
    }

    const data = parsed.data;
    if (!data.id) {
      return NextResponse.json({ success: false, error: "ID requis." }, { status: 400 });
    }
    const catId = data.id;
    const db = await getDb();

    let finalSlug = data.slug && data.slug.trim() !== "" ? slugify(data.slug) : slugify(data.name);
    let counter = 1;
    const baseSlug = finalSlug;
    while (true) {
      const [duplicate] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, finalSlug))
        .limit(1);
      if (!duplicate || duplicate.id === catId) break;
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    await db
      .update(categories)
      .set({
        name: data.name.trim(),
        slug: finalSlug,
        description: data.description.trim(),
        imageKey: data.imageKey || null,
        isPublished: data.isPublished,
        position: data.position,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, catId));

    invalidateCache("store:");
    invalidateCache("admin:categories");
    await logAudit(admin.user.id, "update_category", "categories", catId, { name: data.name });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur mise à jour catégorie :", err);
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
    await db.delete(categories).where(eq(categories.id, id));

    invalidateCache("store:");
    invalidateCache("admin:categories");
    await logAudit(admin.user.id, "delete_category", "categories", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression catégorie :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
