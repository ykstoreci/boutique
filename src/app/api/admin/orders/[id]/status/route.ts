import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { getDb } from "@/db";
import {
  orders,
  orderItems,
  orderStatusHistory,
  products,
  productVariants,
  stockMovements,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/db/schema";
import { invalidateCache } from "@/lib/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const db = await getDb();

  try {
    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Données invalides." }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return NextResponse.json({ success: false, error: "Commande introuvable." }, { status: 404 });
    }

    const { status, paymentStatus, note } = parsed.data;

    await db.transaction(async (tx) => {
      // 1. Mise à jour du statut de la commande
      if (status && status !== order.status) {
        // RÈGLE MÉTIER : Si passage au statut "cancelled" et stock était réservé -> RESTITUER LE STOCK
        if (status === "cancelled" && order.stockReserved) {
          const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));

          for (const item of items) {
            if (item.variantId) {
              const [v] = await tx.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1);
              if (v) {
                const newStock = v.stock + item.quantity;
                await tx.update(productVariants).set({ stock: newStock, updatedAt: new Date() }).where(eq(productVariants.id, v.id));
                await tx.insert(stockMovements).values({
                  productId: item.productId,
                  variantId: v.id,
                  label: `${item.productName} (${item.variantName || ""})`,
                  delta: item.quantity,
                  stockAfter: newStock,
                  reason: "order_cancelled",
                  orderId: order.id,
                  adminUserId: admin.user.id,
                  note: "Restitution de stock suite à annulation de commande",
                });
              }
            } else if (item.productId) {
              const [p] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
              if (p && p.trackStock) {
                const newStock = p.stock + item.quantity;
                await tx.update(products).set({ stock: newStock, updatedAt: new Date() }).where(eq(products.id, p.id));
                await tx.insert(stockMovements).values({
                  productId: p.id,
                  variantId: null,
                  label: item.productName,
                  delta: item.quantity,
                  stockAfter: newStock,
                  reason: "order_cancelled",
                  orderId: order.id,
                  adminUserId: admin.user.id,
                  note: "Restitution de stock suite à annulation de commande",
                });
              }
            }
          }

          // Marquer le stock comme n'étant plus réservé
          await tx.update(orders).set({ stockReserved: false }).where(eq(orders.id, order.id));
        }

        // RÈGLE MÉTIER : Si la commande était annulée et qu'on la réactive -> tenter de réserver le stock à nouveau
        if (order.status === "cancelled" && status !== "cancelled" && !order.stockReserved) {
          const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          for (const item of items) {
            if (item.variantId) {
              const [v] = await tx.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1);
              if (v) {
                const newStock = Math.max(0, v.stock - item.quantity);
                await tx.update(productVariants).set({ stock: newStock, updatedAt: new Date() }).where(eq(productVariants.id, v.id));
                await tx.insert(stockMovements).values({
                  productId: item.productId,
                  variantId: v.id,
                  label: `${item.productName} (${item.variantName || ""})`,
                  delta: -item.quantity,
                  stockAfter: newStock,
                  reason: "order_reserved",
                  orderId: order.id,
                  adminUserId: admin.user.id,
                  note: "Réservation de stock suite à réactivation",
                });
              }
            } else if (item.productId) {
              const [p] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
              if (p && p.trackStock) {
                const newStock = Math.max(0, p.stock - item.quantity);
                await tx.update(products).set({ stock: newStock, updatedAt: new Date() }).where(eq(products.id, p.id));
                await tx.insert(stockMovements).values({
                  productId: p.id,
                  variantId: null,
                  label: item.productName,
                  delta: -item.quantity,
                  stockAfter: newStock,
                  reason: "order_reserved",
                  orderId: order.id,
                  adminUserId: admin.user.id,
                  note: "Réservation de stock suite à réactivation",
                });
              }
            }
          }
          await tx.update(orders).set({ stockReserved: true }).where(eq(orders.id, order.id));
        }

        await tx
          .update(orders)
          .set({ status, updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          kind: "status",
          fromValue: order.status,
          toValue: status,
          note: note || null,
          adminUserId: admin.user.id,
        });
      }

      // 2. Mise à jour du statut de paiement
      if (paymentStatus && paymentStatus !== order.paymentStatus) {
        await tx
          .update(orders)
          .set({ paymentStatus, updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          kind: "payment",
          fromValue: order.paymentStatus,
          toValue: paymentStatus,
          note: note || null,
          adminUserId: admin.user.id,
        });
      }

      // 3. Note interne sans changement de statut
      if (!status && !paymentStatus && note && note.trim()) {
        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          kind: "note",
          fromValue: null,
          toValue: "note",
          note: note.trim(),
          adminUserId: admin.user.id,
        });
      }
    });

    await logAudit(
      admin.user.id,
      "update_order",
      "orders",
      order.id,
      { status, paymentStatus, note }
    );

    invalidateCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur mise à jour commande :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

