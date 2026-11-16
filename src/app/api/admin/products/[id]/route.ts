import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { getDb } from "@/db";
import {
  products,
  productImages,
  productVariants,
  stockMovements,
} from "@/db/schema";
import { slugify } from "@/lib/slug";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(200).optional(),
  reference: z.string().max(80).optional().nullable(),
  description: z.string().default(""),
  price: z.coerce.number().int().min(0),
  promoPrice: z.coerce.number().int().min(0).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  trackStock: z.boolean().default(true),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  isFeatured: z.boolean().default(false),
  images: z.array(
    z.object({
      storageKey: z.string(),
      width: z.number().default(800),
      height: z.number().default(800),
      alt: z.string().default(""),
      isMain: z.boolean().default(false),
      position: z.number().default(0),
    })
  ).default([]),
  variants: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      sku: z.string().optional().nullable(),
      price: z.coerce.number().int().min(0).optional().nullable(),
      stock: z.coerce.number().int().min(0).default(0),
      position: z.number().default(0),
      isActive: z.boolean().default(true),
    })
  ).default([]),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await context.params;
  const db = await getDb();

  try {
    const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Produit introuvable." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = parsed.data;

    // Slug unique
    let finalSlug = data.slug && data.slug.trim() !== "" ? slugify(data.slug) : slugify(data.name);
    let counter = 1;
    const baseSlug = finalSlug;
    while (true) {
      const [duplicate] = await db
        .select()
        .from(products)
        .where(and(eq(products.slug, finalSlug), ne(products.id, id)))
        .limit(1);
      if (!duplicate) break;
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    await db.transaction(async (tx) => {
      // 1. Mise à jour de la table principale
      await tx
        .update(products)
        .set({
          name: data.name.trim(),
          slug: finalSlug,
          reference: data.reference?.trim() || null,
          description: data.description,
          price: data.price,
          promoPrice: data.promoPrice || null,
          categoryId: data.categoryId || null,
          stock: data.stock,
          trackStock: data.trackStock,
          specs: data.specs,
          status: data.status,
          isFeatured: data.isFeatured,
          publishedAt: data.status === "published" && !existing.publishedAt ? new Date() : existing.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id));

      // Mouvement de stock manuel si le stock principal a changé
      if (data.trackStock && data.variants.length === 0 && data.stock !== existing.stock) {
        const delta = data.stock - existing.stock;
        await tx.insert(stockMovements).values({
          productId: id,
          variantId: null,
          label: data.name,
          delta,
          stockAfter: data.stock,
          reason: "manual",
          adminUserId: admin.user.id,
          note: "Ajustement manuel depuis la fiche produit",
        });
      }

      // 2. Remplacement des images
      await tx.delete(productImages).where(eq(productImages.productId, id));
      let mainAssigned = false;
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        const isMain = img.isMain && !mainAssigned ? true : !mainAssigned && i === 0;
        if (isMain) mainAssigned = true;

        await tx.insert(productImages).values({
          productId: id,
          storageKey: img.storageKey,
          width: img.width,
          height: img.height,
          alt: img.alt || data.name,
          position: i,
          isMain,
        });
      }

      // 3. Remplacement / Mise à jour des variantes
      await tx.delete(productVariants).where(eq(productVariants.productId, id));
      for (let i = 0; i < data.variants.length; i++) {
        const v = data.variants[i];
        await tx.insert(productVariants).values({
          productId: id,
          name: v.name.trim(),
          sku: v.sku?.trim() || null,
          price: v.price || null,
          stock: v.stock,
          position: i,
          isActive: v.isActive,
        });
      }
    });

    await logAudit(admin.user.id, "update_product", "products", id, { name: data.name });
    return NextResponse.json({ success: true, productId: id });
  } catch (err) {
    console.error("Erreur modification produit :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await context.params;
  const db = await getDb();

  try {
    const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Produit introuvable." }, { status: 404 });
    }

    await db.delete(products).where(eq(products.id, id));
    await logAudit(admin.user.id, "delete_product", "products", id, { name: existing.name });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression produit :", err);
    return NextResponse.json({ success: false, error: "Erreur lors de la suppression." }, { status: 500 });
  }
}

