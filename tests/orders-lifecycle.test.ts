import { describe, it, expect, beforeAll } from "vitest";

// Définir la base en mémoire avant les imports
process.env.DATABASE_URL = "pglite:memory";

import { getDb } from "../src/db";
import {
  products,
  productVariants,
  categories,
  storeSettings,
  shippingZones,
  orders,
  orderItems,
  stockMovements,
  customers,
} from "../src/db/schema";
import { createOrder } from "../src/lib/orders";
import { eq } from "drizzle-orm";

let productId: string;

beforeAll(async () => {
  const db = await getDb();

  // Paramètres initiaux
  await db.insert(storeSettings).values({
    id: 1,
    storeName: "Test Boutique",
    whatsappNumber: "2250700000000",
    currency: "XOF",
    locale: "fr-FR",
    ordersEnabled: true,
    deliveryEnabled: true,
    shippingEnabled: true,
    defaultDeliveryFee: 1500,
    defaultShippingFee: null,
    lowStockThreshold: 3,
  });

  // Zones
  await db.insert(shippingZones).values([
    { type: "delivery", name: "Cocody", fee: 1000, isActive: true },
    { type: "shipping", name: "Bouaké", fee: 3000, isActive: true },
  ]);

  // Création d'un produit avec stock = 10
  const [p] = await db
    .insert(products)
    .values({
      name: "Montre de Luxe",
      slug: "montre-de-luxe",
      price: 50000,
      promoPrice: 40000,
      stock: 10,
      trackStock: true,
      status: "published",
    })
    .returning({ id: products.id });
  productId = p.id;
});

describe("Cycle de vie complet d'une commande", () => {
  it("enregistre la commande en base et décrémente le stock en mode livraison", async () => {
    const db = await getDb();
    // 1. Passer la commande
    const res = await createOrder({
      mode: "delivery",
      customerName: "Koffi Michel",
      customerPhone: "0701020304",
      commune: "Cocody",
      district: "Danga",
      idempotencyKey: "test-key-1",
      items: [{ productId, quantity: 2 }],
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.orderNumber).toMatch(/^CMD-/);
    // Règle métier : Pour la livraison locale, pas de redirection WhatsApp
    expect(res.whatsappUrl).toBeNull();

    // 2. Vérifier l'enregistrement en base
    const [savedOrder] = await db.select().from(orders).where(eq(orders.id, res.orderId));
    expect(savedOrder).toBeDefined();
    expect(savedOrder.customerName).toBe("Koffi Michel");
    expect(savedOrder.subtotal).toBe(80000); // 2 * 40000 (prix promo effectif)
    expect(savedOrder.fee).toBe(1000); // Zone Cocody
    expect(savedOrder.total).toBe(81000);
    expect(savedOrder.stockReserved).toBe(true);

    // 3. Vérifier la décrémentation du stock
    const [updatedProduct] = await db.select().from(products).where(eq(products.id, productId));
    expect(updatedProduct.stock).toBe(8); // 10 - 2

    // 4. Vérifier le mouvement de stock
    const [movement] = await db.select().from(stockMovements).where(eq(stockMovements.orderId, res.orderId));
    expect(movement).toBeDefined();
    expect(movement.delta).toBe(-2);
    expect(movement.stockAfter).toBe(8);
    expect(movement.reason).toBe("order_reserved");
  });

  it("protège contre les doubles commandes grâce à l'idempotence (aucun doublon ni décrémentation supplémentaire)", async () => {
    const db = await getDb();
    // Renvoyer exactement la même clé d'idempotence
    const duplicateRes = await createOrder({
      mode: "delivery",
      customerName: "Koffi Michel",
      customerPhone: "0701020304",
      commune: "Cocody",
      district: "Danga",
      idempotencyKey: "test-key-1",
      items: [{ productId, quantity: 2 }],
    });

    expect(duplicateRes.success).toBe(true);

    // Le stock ne doit PAS avoir été décrémenté une seconde fois
    const [p] = await db.select().from(products).where(eq(products.id, productId));
    expect(p.stock).toBe(8); // Reste 8
  });

  it("génère une URL WhatsApp pour une commande en mode expédition", async () => {
    const res = await createOrder({
      mode: "shipping",
      customerName: "Awa Koné",
      customerPhone: "0709080706",
      city: "Bouaké",
      idempotencyKey: "test-key-shipping-1",
      items: [{ productId, quantity: 1 }],
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.orderNumber).toMatch(/^CMD-/);
    // Pour l'expédition, WhatsApp doit être présent
    expect(res.whatsappUrl).toContain("https://wa.me/2250700000000");
  });

  it("refuse la commande en cas de stock insuffisant", async () => {
    const res = await createOrder({
      mode: "delivery",
      customerName: "Inconnu",
      customerPhone: "0701020304",
      commune: "Cocody",
      district: "Danga",
      idempotencyKey: "test-key-insufficient",
      items: [{ productId, quantity: 50 }], // Stock dispo = 8
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain("Stock insuffisant");
    }
  });
});
