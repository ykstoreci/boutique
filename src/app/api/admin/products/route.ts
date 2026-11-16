import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import { getDb } from "@/db";
import {
  products,
  productImages,
  productVariants,
  stockMovements,
} from "@/db/schema";
import { slugify } from "@/lib/slug";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis").max(200),
  slug: z.string().max(200).optional(),
  reference: z.string().max(80).optional().nullable(),
  description: z.string().default(""),
  price: z.coerce.number().int().min(0, "Prix invalide"),
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
      name: z.string().min(1),
      sku: z.string().optional().nullable(),
      price: z.coerce.number().int().min(0).optional().nullable(),
      stock: z.coerce.number().int().min(0).default(0),
      position: z.number().default(0),
      isActive: z.boolean().default(true),
    })
  ).default([]),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();

    // Action Duplication
    if (body.action === "duplicate" && body.productId) {
      const db = await getDb();
      const [orig] = await db.select().from(products).where(eq(products.id, body.productId)).limit(1);
      if (!orig) return NextResponse.json({ success: false, error: "Produit introuvable." }, { status: 404 });

      const origImages = await db.select().from(productImages).where(eq(productImages.productId, orig.id));
      const origVariants = await db.select().from(productVariants).where(eq(productVariants.productId, orig.id));

      const newName = `${orig.name} (Copie)`;
      const newSlug = `${orig.slug}-copie-${Date.now().toString(36)}`;

      let createdId = "";
      await db.transaction(async (tx) => {
        const [dup] = await tx
          .insert(products)
          .values({
            name: newName,
            slug: newSlug,
            reference: orig.reference ? `${orig.reference}-CP` : null,
            description: orig.description,
            price: orig.price,
            promoPrice: orig.promoPrice,
            categoryId: orig.categoryId,
            stock: orig.stock,
            trackStock: orig.trackStock,
            specs: orig.specs,
            status: "draft",
            isFeatured: false,
          })
          .returning({ id: products.id });

        createdId = dup.id;

        for (const img of origImages) {
          await tx.insert(productImages).values({
            productId: dup.id,
            storageKey: img.storageKey,
            width: img.width,
            height: img.height,
            alt: img.alt,
            position: img.position,
            isMain: img.isMain,
          });
        }

        for (const v of origVariants) {
          await tx.insert(productVariants).values({
            productId: dup.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            position: v.position,
            isActive: v.isActive,
          });
        }
      });

      invalidateCache();
      await logAudit(admin.user.id, "duplicate_product", "products", createdId, { originalId: orig.id });
      return NextResponse.json({ success: true, productId: createdId });
    }

    // Création normale
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      const err = parsed.error.issues[0]?.message || "Données invalides.";
      return NextResponse.json({ success: false, error: err }, { status: 400 });
    }

    const data = parsed.data;
    const db = await getDb();

    // Génération d'un slug unique
    let baseSlug = data.slug && data.slug.trim() !== "" ? slugify(data.slug) : slugify(data.name);
    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const [existing] = await db.select().from(products).where(eq(products.slug, finalSlug)).limit(1);
      if (!existing) break;
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    let productId = "";

    await db.transaction(async (tx) => {
      const [newProd] = await tx
        .insert(products)
        .values({
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
          publishedAt: data.status === "published" ? new Date() : null,
        })
        .returning({ id: products.id });

      productId = newProd.id;

      // Images
      let mainAssigned = false;
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        const isMain = img.isMain && !mainAssigned ? true : !mainAssigned && i === 0;
        if (isMain) mainAssigned = true;

        await tx.insert(productImages).values({
          productId: newProd.id,
          storageKey: img.storageKey,
          width: img.width,
          height: img.height,
          alt: img.alt || data.name,
          position: i,
          isMain,
        });
      }

      // Variantes
      for (let i = 0; i < data.variants.length; i++) {
        const v = data.variants[i];
        const [variantRow] = await tx
          .insert(productVariants)
          .values({
            productId: newProd.id,
            name: v.name.trim(),
            sku: v.sku?.trim() || null,
            price: v.price || null,
            stock: v.stock,
            position: i,
            isActive: v.isActive,
          })
          .returning({ id: productVariants.id });

        if (data.trackStock && v.stock > 0) {
          await tx.insert(stockMovements).values({
            productId: newProd.id,
            variantId: variantRow.id,
            label: `${data.name} (${v.name})`,
            delta: v.stock,
            stockAfter: v.stock,
            reason: "initial",
            adminUserId: admin.user.id,
            note: "Stock initial à la création",
          });
        }
      }

      // Mouvement de stock initial pour le produit sans variante
      if (data.trackStock && data.variants.length === 0 && data.stock > 0) {
        await tx.insert(stockMovements).values({
          productId: newProd.id,
          variantId: null,
          label: data.name,
          delta: data.stock,
          stockAfter: data.stock,
          reason: "initial",
          adminUserId: admin.user.id,
          note: "Stock initial à la création",
        });
      }
    });

    invalidateCache();
    await logAudit(admin.user.id, "create_product", "products", productId, { name: data.name });
    return NextResponse.json({ success: true, productId });
  } catch (err) {
    console.error("Erreur création produit :", err);
    return NextResponse.json({ success: false, error: "Erreur lors de la création du produit." }, { status: 500 });
  }
}

