import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { invalidateCache } from "@/lib/cache";
import {
  orders,
  orderItems,
  orderStatusHistory,
  customers,
  deliveryAddresses,
  products,
  productVariants,
  productImages,
  shippingZones,
  storeSettings,
  stockMovements,
  stockArrivalItems,
} from "@/db/schema";
import { normalizePhone, isValidPhone } from "./phone";
import { effectivePrice } from "./money";
import { generateOrderNumber, generateAccessToken, hashAccessToken } from "./order-number";
import { buildWhatsappMessage, buildWhatsappUrl } from "./whatsapp";
import { sendAdminNotification } from "./push";

export const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const createOrderSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("delivery"),
    customerName: z.string().min(2, "Le nom est requis").max(100),
    customerPhone: z.string().min(8, "Numéro de téléphone invalide").max(25),
    commune: z.string().min(2, "La commune est requise").max(100),
    district: z.string().min(2, "Le quartier ou lieu de livraison est requis").max(120),
    addressDetails: z.string().max(500).optional().nullable(),
    items: z.array(orderItemInputSchema).min(1, "Votre commande est vide"),
    idempotencyKey: z.string().min(10).max(100),
    source: z.string().max(100).optional(),
    utmSource: z.string().max(100).optional().nullable(),
    utmMedium: z.string().max(100).optional().nullable(),
    utmCampaign: z.string().max(100).optional().nullable(),
    referrer: z.string().max(500).optional().nullable(),
  }),
  z.object({
    mode: z.literal("shipping"),
    customerName: z.string().min(2, "Le nom est requis").max(100),
    customerPhone: z.string().min(8, "Numéro de téléphone invalide").max(25),
    city: z.string().min(2, "La ville de destination est requise").max(100),
    addressDetails: z.string().max(500).optional().nullable(),
    items: z.array(orderItemInputSchema).min(1, "Votre commande est vide"),
    idempotencyKey: z.string().min(10).max(100),
    source: z.string().max(100).optional(),
    utmSource: z.string().max(100).optional().nullable(),
    utmMedium: z.string().max(100).optional().nullable(),
    utmCampaign: z.string().max(100).optional().nullable(),
    referrer: z.string().max(500).optional().nullable(),
  }),
]);

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export type CreateOrderResult =
  | {
      success: true;
      orderId: string;
      orderNumber: string;
      accessToken: string;
      mode: "delivery" | "shipping";
      whatsappUrl: string | null;
      whatsappMessage: string | null;
    }
  | {
      success: false;
      error: string;
    };

export async function createOrder(input: CreateOrderInput, ip?: string): Promise<CreateOrderResult> {
  const db = await getDb();

  // 1. Récupérer les paramètres généraux de la boutique
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  if (!settings) {
    return { success: false, error: "La boutique n'est pas encore initialisée." };
  }

  if (!settings.ordersEnabled) {
    return { success: false, error: "La boutique n'accepte pas de commande actuellement." };
  }

  if (!settings.whatsappNumber || settings.whatsappNumber.trim() === "") {
    return { success: false, error: "Le service de commande est momentanément indisponible (contact non configuré)." };
  }

  if (input.mode === "delivery" && !settings.deliveryEnabled) {
    return { success: false, error: "Le service de livraison locale est temporairement désactivé." };
  }

  if (input.mode === "shipping" && !settings.shippingEnabled) {
    return { success: false, error: "Le service d'expédition est temporairement désactivé." };
  }

  // 2. Validation du téléphone
  if (!isValidPhone(input.customerPhone)) {
    return { success: false, error: "Le numéro de téléphone n'est pas valide." };
  }
  const cleanPhone = normalizePhone(input.customerPhone);

  // 3. Protection anti-doublon / Idempotence
  // Si une commande avec cette clé existe déjà, retourner directement ses informations
  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, input.idempotencyKey))
    .limit(1);

  if (existingOrder) {
    const isShipping = existingOrder.mode === "shipping";
    const whatsappUrl = isShipping
      ? buildWhatsappUrl(existingOrder.whatsappNumber, existingOrder.whatsappMessage)
      : null;
    return {
      success: true,
      orderId: existingOrder.id,
      orderNumber: existingOrder.number,
      accessToken: "", // L'ordre a déjà été créé
      mode: existingOrder.mode,
      whatsappUrl,
      whatsappMessage: isShipping ? existingOrder.whatsappMessage : null,
    };
  }

  // 4. Vérifier les produits et calculer les montants côté serveur
  type ValidatedItem = {
    product: typeof products.$inferSelect;
    variant: typeof productVariants.$inferSelect | null;
    imageKey: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  };

  const validatedItems: ValidatedItem[] = [];

  for (const itemInput of input.items) {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, itemInput.productId), eq(products.status, "published")))
      .limit(1);

    if (!product) {
      return { success: false, error: "Un des produits commandés n'est plus disponible." };
    }

    let variant: typeof productVariants.$inferSelect | null = null;
    let unitPrice = effectivePrice(product.price, product.promoPrice);

    if (itemInput.variantId) {
      const [v] = await db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, itemInput.variantId),
            eq(productVariants.productId, product.id),
            eq(productVariants.isActive, true)
          )
        )
        .limit(1);

      if (!v) {
        return { success: false, error: `La variante sélectionnée pour ${product.name} n'est plus disponible.` };
      }
      variant = v;
      if (v.price !== null && v.price !== undefined) {
        unitPrice = v.price;
      }

      // Vérifier le stock de la variante
      if (product.trackStock && v.stock < itemInput.quantity) {
        return {
          success: false,
          error: `Stock insuffisant pour ${product.name} (${v.name}). Disponible : ${v.stock}.`,
        };
      }
    } else {
      // Vérifier le stock du produit principal
      if (product.trackStock && product.stock < itemInput.quantity) {
        return {
          success: false,
          error: `Stock insuffisant pour ${product.name}. Disponible : ${product.stock}.`,
        };
      }
    }

    // Récupérer l'image principale
    const [mainImg] = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(sql`${productImages.isMain} DESC`, productImages.position)
      .limit(1);

    const lineTotal = unitPrice * itemInput.quantity;
    validatedItems.push({
      product,
      variant,
      imageKey: mainImg ? mainImg.storageKey : null,
      unitPrice,
      quantity: itemInput.quantity,
      lineTotal,
    });
  }

  const subtotal = validatedItems.reduce((acc, item) => acc + item.lineTotal, 0);

  // 5. Calcul des frais de livraison ou d'expédition
  let fee: number | null = null;
  if (input.mode === "delivery") {
    const [zone] = await db
      .select()
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.type, "delivery"),
          eq(shippingZones.isActive, true),
          sql`lower(${shippingZones.name}) = lower(${input.commune.trim()})`
        )
      )
      .limit(1);

    if (zone && zone.fee !== null) {
      fee = zone.fee;
    } else if (settings.defaultDeliveryFee !== null && settings.defaultDeliveryFee !== undefined) {
      fee = settings.defaultDeliveryFee;
    }
  } else {
    // shipping
    const [zone] = await db
      .select()
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.type, "shipping"),
          eq(shippingZones.isActive, true),
          sql`lower(${shippingZones.name}) = lower(${input.city.trim()})`
        )
      )
      .limit(1);

    if (zone && zone.fee !== null) {
      fee = zone.fee;
    } else if (settings.defaultShippingFee !== null && settings.defaultShippingFee !== undefined) {
      fee = settings.defaultShippingFee;
    }
  }

  const total = subtotal + (fee ?? 0);

  // 6. Génération du numéro de commande et jeton d'accès
  const orderNumber = generateOrderNumber();
  const accessToken = generateAccessToken();
  const accessTokenHash = hashAccessToken(accessToken);

  // 7. Construction du message WhatsApp dynamique
  const whatsappMessage = buildWhatsappMessage({
    number: orderNumber,
    mode: input.mode,
    customerName: input.customerName.trim(),
    customerPhone: cleanPhone,
    commune: input.mode === "delivery" ? input.commune.trim() : null,
    district: input.mode === "delivery" ? input.district.trim() : null,
    city: input.mode === "shipping" ? input.city.trim() : null,
    addressDetails: input.addressDetails?.trim() || null,
    items: validatedItems.map((v) => ({
      name: v.product.name,
      variantName: v.variant ? v.variant.name : null,
      quantity: v.quantity,
      unitPrice: v.unitPrice,
      lineTotal: v.lineTotal,
    })),
    subtotal,
    fee,
    total,
    currency: settings.currency,
    locale: settings.locale,
    source: input.source,
  });

  const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, whatsappMessage);

  // 8. Enregistrement en base de données dans une transaction sécurisée
  let createdOrderId = "";

  await db.transaction(async (tx) => {
    // Client : trouver ou créer
    let customerId: string | undefined = undefined;
    const [existingCustomer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.phone, cleanPhone))
      .limit(1);

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Mettre à jour le nom si plus récent
      await tx
        .update(customers)
        .set({
          name: input.customerName.trim(),
          city: (input.mode === "shipping" ? input.city : input.commune) || existingCustomer.city,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, existingCustomer.id));
    } else {
      const [newCust] = await tx
        .insert(customers)
        .values({
          name: input.customerName.trim(),
          phone: cleanPhone,
          city: (input.mode === "shipping" ? input.city : input.commune) || "",
        })
        .returning({ id: customers.id });
      customerId = newCust.id;
    }

    // Adresse de livraison
    const [deliveryAddr] = await tx
      .insert(deliveryAddresses)
      .values({
        customerId,
        mode: input.mode,
        commune: input.mode === "delivery" ? input.commune.trim() : null,
        district: input.mode === "delivery" ? input.district.trim() : null,
        city: input.mode === "shipping" ? input.city.trim() : null,
        details: input.addressDetails?.trim() || null,
      })
      .returning({ id: deliveryAddresses.id });

    // Commande principale
    const [order] = await tx
      .insert(orders)
      .values({
        number: orderNumber,
        accessTokenHash,
        idempotencyKey: input.idempotencyKey,
        customerId,
        deliveryAddressId: deliveryAddr.id,
        mode: input.mode,
        customerName: input.customerName.trim(),
        customerPhone: cleanPhone,
        commune: input.mode === "delivery" ? input.commune.trim() : null,
        district: input.mode === "delivery" ? input.district.trim() : null,
        city: input.mode === "shipping" ? input.city.trim() : null,
        addressDetails: input.addressDetails?.trim() || null,
        subtotal,
        fee,
        total,
        currency: settings.currency,
        status: "new",
        paymentStatus: "pending",
        stockReserved: true,
        whatsappMessage,
        whatsappNumber: settings.whatsappNumber,
        ip: ip || null,
        source: input.source || "direct",
        utmSource: input.utmSource || null,
        utmMedium: input.utmMedium || null,
        utmCampaign: input.utmCampaign || null,
        referrer: input.referrer || null,
      })
      .returning({ id: orders.id });

    createdOrderId = order.id;

    // Articles de la commande avec instantané complet
    for (const item of validatedItems) {
      let itemUnitCost = item.product.purchasePrice || 0;

      // Suivi FIFO sur les arrivages liés à ce produit
      try {
        const arrivalLots = await tx
          .select()
          .from(stockArrivalItems)
          .where(eq(stockArrivalItems.productId, item.product.id))
          .orderBy(stockArrivalItems.createdAt);

        let remainingToAllocate = item.quantity;
        for (const lot of arrivalLots) {
          if (remainingToAllocate <= 0) break;
          const availableInLot = Math.max(0, lot.quantity - lot.soldQuantity);
          if (availableInLot > 0) {
            const take = Math.min(availableInLot, remainingToAllocate);
            await tx
              .update(stockArrivalItems)
              .set({ soldQuantity: lot.soldQuantity + take })
              .where(eq(stockArrivalItems.id, lot.id));
            if (itemUnitCost === 0 && lot.purchasePrice > 0) {
              itemUnitCost = lot.purchasePrice;
            }
            remainingToAllocate -= take;
          }
        }
      } catch {
        // Ignorer si pas d'arrivage associé
      }

      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: item.product.id,
        variantId: item.variant?.id || null,
        productName: item.product.name,
        productReference: item.product.reference || null,
        variantName: item.variant?.name || null,
        imageKey: item.imageKey || null,
        unitCost: itemUnitCost,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      });

      // Décrémenter le stock et enregistrer le mouvement
      if (item.product.trackStock) {
        if (item.variant) {
          const newStock = Math.max(0, item.variant.stock - item.quantity);
          await tx
            .update(productVariants)
            .set({ stock: newStock, updatedAt: new Date() })
            .where(eq(productVariants.id, item.variant.id));

          await tx.insert(stockMovements).values({
            productId: item.product.id,
            variantId: item.variant.id,
            label: `${item.product.name} (${item.variant.name})`,
            delta: -item.quantity,
            stockAfter: newStock,
            reason: "order_reserved",
            orderId: order.id,
          });
        } else {
          const newStock = Math.max(0, item.product.stock - item.quantity);
          await tx
            .update(products)
            .set({ stock: newStock, updatedAt: new Date() })
            .where(eq(products.id, item.product.id));

          await tx.insert(stockMovements).values({
            productId: item.product.id,
            variantId: null,
            label: item.product.name,
            delta: -item.quantity,
            stockAfter: newStock,
            reason: "order_reserved",
            orderId: order.id,
          });
        }
      }
    }

    // Historique de statut initial
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      kind: "status",
      fromValue: null,
      toValue: "new",
      note: "Commande passée par le client",
    });
  });

  // 9. Envoi asynchrone de la notification Push au propriétaire
  // L'échec du push ne bloque jamais la commande enregistrée
  const sourceLabel = input.source && input.source !== "direct" ? ` via ${input.source.toUpperCase()}` : "";
  const notifBody = `${input.customerName.trim()} a commandé pour ${total} ${settings.currency} (${
    input.mode === "delivery" ? "Livraison" : "Expédition"
  })${sourceLabel}.`;

  sendAdminNotification("new_order", {
    title: `Nouvelle commande ! [${orderNumber}]`,
    body: notifBody,
    orderId: createdOrderId,
    url: `/admin/orders/${createdOrderId}`,
  }).catch((err) => {
    console.error("Erreur push notification :", err);
  });

  // Vérifier alertes de stock faible
  for (const item of validatedItems) {
    if (item.product.trackStock) {
      const remaining = item.variant ? item.variant.stock - item.quantity : item.product.stock - item.quantity;
      if (remaining <= settings.lowStockThreshold) {
        sendAdminNotification(remaining <= 0 ? "out_of_stock" : "low_stock", {
          title: remaining <= 0 ? "Rupture de stock !" : "Alerte stock faible",
          body: `${item.product.name}${item.variant ? ` (${item.variant.name})` : ""} : reste ${remaining} unité(s).`,
          productId: item.product.id,
          url: `/admin/products/${item.product.id}`,
        }).catch(() => {});
      }
    }
  }

  invalidateCache();
  const isShipping = input.mode === "shipping";
  return {
    success: true,
    orderId: createdOrderId,
    orderNumber,
    accessToken,
    mode: input.mode,
    whatsappUrl: isShipping ? whatsappUrl : null,
    whatsappMessage: isShipping ? whatsappMessage : null,
  };
}

