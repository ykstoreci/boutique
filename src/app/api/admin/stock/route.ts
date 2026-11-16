import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import { getDb } from "@/db";
import {
  products,
  productVariants,
  stockMovements,
  stockArrivals,
  stockArrivalItems,
} from "@/db/schema";
import { slugify } from "@/lib/slug";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const stockAdjustSchema = z.object({
  action: z.literal("adjust_stock").optional(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  newStock: z.coerce.number().int().min(0),
  purchasePrice: z.coerce.number().int().min(0).optional(),
  price: z.coerce.number().int().min(0).optional(),
  note: z.string().max(200).optional(),
});

const arrivalItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  productName: z.string().min(1, "Nom de la marchandise requis").max(200),
  quantity: z.coerce.number().int().min(1, "La quantité doit être supérieure à 0"),
  soldQuantity: z.coerce.number().int().min(0).default(0),
  purchasePrice: z.coerce.number().int().min(0, "Prix d'achat invalide"),
  sellingPrice: z.coerce.number().int().min(0, "Prix de vente invalide"),
});

const createArrivalSchema = z.object({
  action: z.literal("create_arrival"),
  reference: z.string().min(1, "Titre ou référence de l'arrivage requis").max(150),
  arrivalDate: z.string().optional(),
  supplier: z.string().max(150).default(""),
  notes: z.string().max(500).default(""),
  syncCatalog: z.boolean().default(true),
  items: z.array(arrivalItemSchema).min(1, "Ajoutez au moins une marchandise à l'arrivage"),
});

const updateArrivalItemSchema = z.object({
  action: z.literal("update_arrival_item"),
  itemId: z.string().uuid(),
  soldQuantity: z.coerce.number().int().min(0).optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  purchasePrice: z.coerce.number().int().min(0).optional(),
  sellingPrice: z.coerce.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const db = await getDb();

    // ─── 1. CRÉATION D'UN ARRIVAGE AVEC SES MARCHANDISES ───
    if (body.action === "create_arrival") {
      const parsed = createArrivalSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message || "Données d'arrivage invalides." },
          { status: 400 }
        );
      }

      const data = parsed.data;
      const arrivalDate = data.arrivalDate ? new Date(data.arrivalDate) : new Date();

      let totalArrivalCost = 0;
      let totalExpectedRevenue = 0;
      let totalExpectedProfit = 0;

      const preparedItems = data.items.map((it) => {
        const lineCost = it.quantity * it.purchasePrice;
        const lineRevenue = it.quantity * it.sellingPrice;
        const lineProfit = lineRevenue - lineCost;
        totalArrivalCost += lineCost;
        totalExpectedRevenue += lineRevenue;
        totalExpectedProfit += lineProfit;
        return {
          ...it,
          soldQuantity: Math.min(it.soldQuantity, it.quantity),
          totalCost: lineCost,
          expectedRevenue: lineRevenue,
          expectedProfit: lineProfit,
        };
      });

      let createdArrivalId = "";

      await db.transaction(async (tx) => {
        const [arrival] = await tx
          .insert(stockArrivals)
          .values({
            reference: data.reference.trim(),
            arrivalDate: isNaN(arrivalDate.getTime()) ? new Date() : arrivalDate,
            supplier: data.supplier.trim(),
            notes: data.notes.trim(),
            totalCost: totalArrivalCost,
            expectedRevenue: totalExpectedRevenue,
            expectedProfit: totalExpectedProfit,
          })
          .returning({ id: stockArrivals.id });

        createdArrivalId = arrival.id;

        for (const item of preparedItems) {
          let linkedProductId = item.productId || null;
          const netStockAdded = Math.max(0, item.quantity - item.soldQuantity);

          if (linkedProductId) {
            // Mettre à jour le stock, le prix d'achat et le prix de vente du produit existant
            const [existingProd] = await tx
              .select()
              .from(products)
              .where(eq(products.id, linkedProductId))
              .limit(1);

            if (existingProd) {
              const newStock = existingProd.stock + netStockAdded;
              await tx
                .update(products)
                .set({
                  stock: newStock,
                  purchasePrice: item.purchasePrice,
                  price: item.sellingPrice > 0 ? item.sellingPrice : existingProd.price,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, existingProd.id));

              await tx.insert(stockMovements).values({
                productId: existingProd.id,
                variantId: null,
                label: existingProd.name,
                delta: netStockAdded,
                stockAfter: newStock,
                reason: "arrival",
                adminUserId: admin.user.id,
                note: `Arrivage : ${data.reference.trim()} (${item.quantity} reçus, PA: ${item.purchasePrice}, PV: ${item.sellingPrice})`,
              });
            }
          } else if (data.syncCatalog) {
            // Chercher si un produit porte déjà exactement ce nom
            const cleanName = item.productName.trim();
            const [byName] = await tx
              .select()
              .from(products)
              .where(sql`lower(${products.name}) = lower(${cleanName})`)
              .limit(1);

            if (byName) {
              linkedProductId = byName.id;
              const newStock = byName.stock + netStockAdded;
              await tx
                .update(products)
                .set({
                  stock: newStock,
                  purchasePrice: item.purchasePrice,
                  price: item.sellingPrice > 0 ? item.sellingPrice : byName.price,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, byName.id));

              await tx.insert(stockMovements).values({
                productId: byName.id,
                variantId: null,
                label: byName.name,
                delta: netStockAdded,
                stockAfter: newStock,
                reason: "arrival",
                adminUserId: admin.user.id,
                note: `Arrivage : ${data.reference.trim()} (${item.quantity} reçus)`,
              });
            } else {
              // Créer automatiquement l'article dans l'inventaire pour suivi du stock
              const baseSlug = slugify(cleanName);
              const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
              const [newProd] = await tx
                .insert(products)
                .values({
                  name: cleanName,
                  slug: uniqueSlug,
                  purchasePrice: item.purchasePrice,
                  price: item.sellingPrice,
                  stock: netStockAdded,
                  trackStock: true,
                  status: "published",
                  publishedAt: new Date(),
                })
                .returning({ id: products.id });

              linkedProductId = newProd.id;

              await tx.insert(stockMovements).values({
                productId: newProd.id,
                variantId: null,
                label: cleanName,
                delta: netStockAdded,
                stockAfter: netStockAdded,
                reason: "arrival",
                adminUserId: admin.user.id,
                note: `Créé via arrivage : ${data.reference.trim()}`,
              });
            }
          }

          await tx.insert(stockArrivalItems).values({
            arrivalId: arrival.id,
            productId: linkedProductId,
            productName: item.productName.trim(),
            quantity: item.quantity,
            soldQuantity: item.soldQuantity,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            totalCost: item.totalCost,
            expectedRevenue: item.expectedRevenue,
            expectedProfit: item.expectedProfit,
          });
        }
      });

      invalidateCache();
      await logAudit(admin.user.id, "create_arrival", "stock_arrivals", createdArrivalId, {
        reference: data.reference,
        itemsCount: data.items.length,
        totalArrivalCost,
        totalExpectedRevenue,
        totalExpectedProfit,
      });

      return NextResponse.json({ success: true, arrivalId: createdArrivalId });
    }

    // ─── 2. MISE À JOUR D'UNE MARCHANDISE D'ARRIVAGE (ex: Quantité vendue, prix) ───
    if (body.action === "update_arrival_item") {
      const parsed = updateArrivalItemSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: "Données invalides." }, { status: 400 });
      }

      const { itemId, soldQuantity, quantity, purchasePrice, sellingPrice } = parsed.data;

      await db.transaction(async (tx) => {
        const [existingItem] = await tx
          .select()
          .from(stockArrivalItems)
          .where(eq(stockArrivalItems.id, itemId))
          .limit(1);

        if (!existingItem) throw new Error("Marchandise introuvable");

        const nextQty = quantity !== undefined ? quantity : existingItem.quantity;
        const nextSold =
          soldQuantity !== undefined
            ? Math.min(Math.max(0, soldQuantity), nextQty)
            : Math.min(existingItem.soldQuantity, nextQty);
        const nextPurchase = purchasePrice !== undefined ? purchasePrice : existingItem.purchasePrice;
        const nextSelling = sellingPrice !== undefined ? sellingPrice : existingItem.sellingPrice;

        const nextTotalCost = nextQty * nextPurchase;
        const nextExpectedRev = nextQty * nextSelling;
        const nextExpectedProfit = nextExpectedRev - nextTotalCost;

        // Si soldQuantity a changé et qu'un produit du catalogue est lié, ajuster son stock en rayon
        const soldDelta = nextSold - existingItem.soldQuantity;
        if (soldDelta !== 0 && existingItem.productId) {
          const [prod] = await tx
            .select()
            .from(products)
            .where(eq(products.id, existingItem.productId))
            .limit(1);
          if (prod && prod.trackStock) {
            const updatedStock = Math.max(0, prod.stock - soldDelta);
            await tx
              .update(products)
              .set({ stock: updatedStock, updatedAt: new Date() })
              .where(eq(products.id, prod.id));
          }
        }

        await tx
          .update(stockArrivalItems)
          .set({
            quantity: nextQty,
            soldQuantity: nextSold,
            purchasePrice: nextPurchase,
            sellingPrice: nextSelling,
            totalCost: nextTotalCost,
            expectedRevenue: nextExpectedRev,
            expectedProfit: nextExpectedProfit,
          })
          .where(eq(stockArrivalItems.id, itemId));

        // Recalculer les totaux de l'arrivage parent
        const siblingItems = await tx
          .select()
          .from(stockArrivalItems)
          .where(eq(stockArrivalItems.arrivalId, existingItem.arrivalId));

        const parentCost = siblingItems.reduce((acc, s) => acc + s.totalCost, 0);
        const parentRev = siblingItems.reduce((acc, s) => acc + s.expectedRevenue, 0);
        const parentProfit = siblingItems.reduce((acc, s) => acc + s.expectedProfit, 0);

        await tx
          .update(stockArrivals)
          .set({
            totalCost: parentCost,
            expectedRevenue: parentRev,
            expectedProfit: parentProfit,
            updatedAt: new Date(),
          })
          .where(eq(stockArrivals.id, existingItem.arrivalId));
      });

      invalidateCache();
      return NextResponse.json({ success: true });
    }

    // ─── 3. AJUSTEMENT MANUEL DU STOCK ET DES PRIX D'UN PRODUIT ───
    const parsed = stockAdjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Données invalides." }, { status: 400 });
    }

    const { productId, variantId, newStock, purchasePrice, price, note } = parsed.data;

    await db.transaction(async (tx) => {
      if (variantId) {
        const [v] = await tx.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
        if (!v) throw new Error("Variante introuvable");
        const delta = newStock - v.stock;
        await tx
          .update(productVariants)
          .set({ stock: newStock, updatedAt: new Date() })
          .where(eq(productVariants.id, variantId));

        await tx.insert(stockMovements).values({
          productId,
          variantId,
          label: `Ajustement (${v.name})`,
          delta,
          stockAfter: newStock,
          reason: "manual",
          adminUserId: admin.user.id,
          note: note?.trim() || "Ajustement manuel direct de l'inventaire",
        });
      } else {
        const [p] = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
        if (!p) throw new Error("Produit introuvable");
        const delta = newStock - p.stock;

        const updatePayload: Record<string, unknown> = {
          stock: newStock,
          updatedAt: new Date(),
        };
        if (purchasePrice !== undefined) updatePayload.purchasePrice = purchasePrice;
        if (price !== undefined && price > 0) updatePayload.price = price;

        await tx.update(products).set(updatePayload).where(eq(products.id, productId));

        if (delta !== 0) {
          await tx.insert(stockMovements).values({
            productId,
            variantId: null,
            label: p.name,
            delta,
            stockAfter: newStock,
            reason: "manual",
            adminUserId: admin.user.id,
            note: note?.trim() || "Ajustement manuel direct de l'inventaire",
          });
        }
      }
    });

    invalidateCache();
    await logAudit(admin.user.id, "adjust_stock", "stock", productId, { variantId, newStock, purchasePrice, price, note });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur gestion stock / arrivages :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const arrivalId = searchParams.get("arrivalId");
    if (!arrivalId) {
      return NextResponse.json({ success: false, error: "ID d'arrivage requis." }, { status: 400 });
    }

    const db = await getDb();
    await db.delete(stockArrivals).where(eq(stockArrivals.id, arrivalId));

    invalidateCache();
    await logAudit(admin.user.id, "delete_arrival", "stock_arrivals", arrivalId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression arrivage :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
