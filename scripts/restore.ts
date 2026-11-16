import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
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

function hydrateDates<T extends Record<string, any>>(row: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[key] = new Date(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

async function main() {
  const argTarget = process.argv[2];
  console.log("=== RESTAURATION D'UNE SAUVEGARDE ===");

  const backupsDir = path.resolve(process.cwd(), "backups");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(backupsDir);
  } catch {
    console.error("Aucun dossier de sauvegarde trouvé.");
    process.exit(1);
  }

  const backupFolders = entries.filter((e) => e.startsWith("backup-"));
  if (backupFolders.length === 0) {
    console.error("Aucune sauvegarde disponible dans ./backups/");
    process.exit(1);
  }

  let selectedFolder: string | undefined;
  if (argTarget) {
    if (backupFolders.includes(argTarget)) {
      selectedFolder = argTarget;
    } else if (!isNaN(Number(argTarget)) && backupFolders[Number(argTarget) - 1]) {
      selectedFolder = backupFolders[Number(argTarget) - 1];
    } else if (argTarget.includes("backup-")) {
      selectedFolder = path.basename(argTarget);
    }
  }

  if (!selectedFolder) {
    const rl = readline.createInterface({ input, output });
    console.log("Sauvegardes disponibles :");
    backupFolders.forEach((f, idx) => console.log(` [${idx + 1}] ${f}`));

    const choice = await rl.question("Entrez le numéro de la sauvegarde à restaurer : ");
    rl.close();
    selectedFolder = backupFolders[Number(choice) - 1];
  }

  if (!selectedFolder) {
    console.error("Choix invalide.");
    process.exit(1);
  }

  console.log(`Sélection : ${selectedFolder}`);
  const targetDir = path.join(backupsDir, selectedFolder);
  const dumpPath = path.join(targetDir, "database.json");
  const rawData = await fs.readFile(dumpPath, "utf-8");
  const dump = JSON.parse(rawData);

  const db = await createDatabase(process.env.DATABASE_URL);

  console.log("Restauration des tables...");

  // Restauration dans l'ordre des contraintes
  if (dump.tables.storeSettings?.length) {
    for (const row of dump.tables.storeSettings) {
      await db.insert(storeSettings).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.adminUsers?.length) {
    for (const row of dump.tables.adminUsers) {
      await db.insert(adminUsers).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.shippingZones?.length) {
    for (const row of dump.tables.shippingZones) {
      await db.insert(shippingZones).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.categories?.length) {
    for (const row of dump.tables.categories) {
      await db.insert(categories).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.products?.length) {
    for (const row of dump.tables.products) {
      await db.insert(products).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.productImages?.length) {
    for (const row of dump.tables.productImages) {
      await db.insert(productImages).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.productVariants?.length) {
    for (const row of dump.tables.productVariants) {
      await db.insert(productVariants).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.productRelations?.length) {
    for (const row of dump.tables.productRelations) {
      await db.insert(productRelations).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.customers?.length) {
    for (const row of dump.tables.customers) {
      await db.insert(customers).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.deliveryAddresses?.length) {
    for (const row of dump.tables.deliveryAddresses) {
      await db.insert(deliveryAddresses).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.orders?.length) {
    for (const row of dump.tables.orders) {
      await db.insert(orders).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.orderItems?.length) {
    for (const row of dump.tables.orderItems) {
      await db.insert(orderItems).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.orderStatusHistory?.length) {
    for (const row of dump.tables.orderStatusHistory) {
      await db.insert(orderStatusHistory).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.stockMovements?.length) {
    for (const row of dump.tables.stockMovements) {
      await db.insert(stockMovements).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.themes?.length) {
    for (const row of dump.tables.themes) {
      await db.insert(themes).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.themeSections?.length) {
    for (const row of dump.tables.themeSections) {
      await db.insert(themeSections).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.themeVersions?.length) {
    for (const row of dump.tables.themeVersions) {
      await db.insert(themeVersions).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.pages?.length) {
    for (const row of dump.tables.pages) {
      await db.insert(pages).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  if (dump.tables.notifications?.length) {
    for (const row of dump.tables.notifications) {
      await db.insert(notifications).values(hydrateDates(row)).onConflictDoNothing();
    }
  }

  // Restauration des fichiers média
  const backupMediaDir = path.join(targetDir, "uploads");
  const mediaDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR || "./storage/uploads");
  try {
    await fs.cp(backupMediaDir, mediaDir, { recursive: true });
    console.log("Fichiers média restaurés.");
  } catch {
    console.log("Pas de fichiers média à restaurer.");
  }

  console.log("=== RESTAURATION TERMINÉE AVEC SUCCÈS ===");
  if (db.$close) await db.$close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur de restauration :", err);
  process.exit(1);
});

