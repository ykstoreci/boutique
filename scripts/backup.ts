import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createDatabase } from "../src/db/client";
import {
  adminUsers,
  storeSettings,
  shippingZones,
  categories,
  products,
  productImages,
  productVariants,
  productRelations,
  customers,
  deliveryAddresses,
  orders,
  orderItems,
  orderStatusHistory,
  stockMovements,
  themes,
  themeSections,
  themeVersions,
  pages,
  notifications,
} from "../src/db/schema";

async function main() {
  console.log("=== CRÉATION D'UNE SAUVEGARDE COMPLÈTE ===");
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve(process.cwd(), "backups", `backup-${timestamp}`);
  await fs.mkdir(backupDir, { recursive: true });

  const db = await createDatabase(process.env.DATABASE_URL);

  const dump = {
    meta: {
      createdAt: now.toISOString(),
      version: "1.0.0",
    },
    tables: {
      adminUsers: await db.select().from(adminUsers),
      storeSettings: await db.select().from(storeSettings),
      shippingZones: await db.select().from(shippingZones),
      categories: await db.select().from(categories),
      products: await db.select().from(products),
      productImages: await db.select().from(productImages),
      productVariants: await db.select().from(productVariants),
      productRelations: await db.select().from(productRelations),
      customers: await db.select().from(customers),
      deliveryAddresses: await db.select().from(deliveryAddresses),
      orders: await db.select().from(orders),
      orderItems: await db.select().from(orderItems),
      orderStatusHistory: await db.select().from(orderStatusHistory),
      stockMovements: await db.select().from(stockMovements),
      themes: await db.select().from(themes),
      themeSections: await db.select().from(themeSections),
      themeVersions: await db.select().from(themeVersions),
      pages: await db.select().from(pages),
      notifications: await db.select().from(notifications),
    },
  };

  const dumpFile = path.join(backupDir, "database.json");
  await fs.writeFile(dumpFile, JSON.stringify(dump, null, 2), "utf-8");
  console.log(`Données de la base enregistrées dans : ${dumpFile}`);

  // Sauvegarder également les fichiers média
  const mediaDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR || "./storage/uploads");
  const backupMediaDir = path.join(backupDir, "uploads");
  try {
    await fs.cp(mediaDir, backupMediaDir, { recursive: true });
    console.log(`Fichiers média sauvegardés dans : ${backupMediaDir}`);
  } catch {
    console.log("Aucun fichier média à copier.");
  }

  console.log(`=== SAUVEGARDE RÉUSSIE DANS : ${backupDir} ===`);
  if (db.$close) await db.$close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur de sauvegarde :", err);
  process.exit(1);
});

