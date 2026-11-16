import { describe, it, expect, beforeAll } from "vitest";
import { createDatabase, type Database } from "../src/db/client";
import {
  products,
  productVariants,
  categories,
  storeSettings,
  shippingZones,
  orders,
  orderItems,
  stockMovements,
} from "../src/db/schema";
import { createOrder } from "../src/lib/orders";
import { buildWhatsappMessage, buildWhatsappUrl } from "../src/lib/whatsapp";
import { generateOrderNumber } from "../src/lib/order-number";
import { effectivePrice, formatMoney } from "../src/lib/money";
import { eq } from "drizzle-orm";

let db: Database;

beforeAll(async () => {
  // Base PostgreSQL en mémoire ultra-rapide et isolée
  db = await createDatabase("pglite:memory", { migrate: true });

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
    defaultShippingFee: null, // À confirmer sur WhatsApp
    lowStockThreshold: 3,
  });

  // Zones de livraison configurées
  await db.insert(shippingZones).values([
    { type: "delivery", name: "Cocody", fee: 1000, isActive: true },
    { type: "shipping", name: "Bouaké", fee: 3000, isActive: true },
    { type: "shipping", name: "Korhogo", fee: null, isActive: true }, // Frais à confirmer
  ]);
});

describe("Vérification des calculs et règles métier", () => {
  it("calcule correctement le prix effectif en promotion", () => {
    expect(effectivePrice(25000, 19000)).toBe(19000);
    expect(effectivePrice(25000, null)).toBe(25000);
    expect(effectivePrice(25000, 30000)).toBe(25000); // Promo invalide ignorée
  });

  it("génère un numéro de commande unique au format requis", () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^CMD-\d{8}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  });

  it("construit le message WhatsApp complet sans variable résiduelle", () => {
    const msg = buildWhatsappMessage({
      number: "CMD-20261111-TEST",
      mode: "delivery",
      customerName: "Kouamé Jean",
      customerPhone: "+2250701020304",
      commune: "Cocody",
      district: "Angré",
      items: [
        { name: "Chemise Blanche", variantName: "Taille L", quantity: 2, unitPrice: 15000, lineTotal: 30000 },
      ],
      subtotal: 30000,
      fee: 1000,
      total: 31000,
      currency: "XOF",
      locale: "fr-FR",
      source: "tiktok",
    });

    expect(msg).toContain("NUMÉRO DE COMMANDE : CMD-20261111-TEST");
    expect(msg).toContain("PRODUIT : Chemise Blanche (Taille L)");
    expect(msg).toContain("QUANTITÉ : 2");
    expect(msg).toContain("MODE DE RÉCEPTION : LIVRAISON");
    expect(msg).toContain("NOM : Kouamé Jean");
    expect(msg).toContain("DESTINATION : Cocody, Angré");
    expect(msg).toContain("ORIGINE : Publicité TIKTOK");
    expect(msg).toContain("MONTANT TOTAL :");
    expect(msg).toContain("PAIEMENT : à la livraison");
    // Aucune variable [NON_REMPLACEE]
    expect(msg).not.toContain("[");
    expect(msg).not.toContain("]");

    const waUrl = buildWhatsappUrl("2250700000000", msg);
    expect(waUrl).toContain("https://wa.me/2250700000000?text=");
  });

  it("affiche 'À CONFIRMER' si les frais d'expédition ne sont pas configurés (ne jamais inventer)", () => {
    const msg = buildWhatsappMessage({
      number: "CMD-20261111-EXP",
      mode: "shipping",
      customerName: "Awa Touré",
      customerPhone: "+2250501020304",
      city: "Korhogo",
      items: [
        { name: "Robe de soirée", quantity: 1, unitPrice: 45000, lineTotal: 45000 },
      ],
      subtotal: 45000,
      fee: null, // Non configuré
      total: 45000,
      currency: "XOF",
      locale: "fr-FR",
    });

    expect(msg).toContain("FRAIS DE EXPÉDITION : À CONFIRMER");
    expect(msg).toContain("MONTANT TOTAL PROVISOIRE (hors frais) :");
    expect(msg).not.toContain("PAIEMENT : à la livraison");
  });
});

