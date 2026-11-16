import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getCachedStoreSettings, cachedQuery } from "@/lib/cache";
import {
  products,
  stockMovements,
  stockArrivals,
  stockArrivalItems,
} from "@/db/schema";
import { AdminStockView } from "@/components/admin/AdminStockView";
import { desc } from "drizzle-orm";

export default async function AdminStockPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const [settings, stockData] = await Promise.all([
    getCachedStoreSettings(),
    cachedQuery("admin:stock:data", 30_000, async () => {
      const db = await getDb();
      const [allProducts, recentMovements, allArrivals, allArrivalItems] = await Promise.all([
        db
          .select({
            id: products.id,
            name: products.name,
            reference: products.reference,
            purchasePrice: products.purchasePrice,
            price: products.price,
            promoPrice: products.promoPrice,
            stock: products.stock,
            trackStock: products.trackStock,
          })
          .from(products)
          .orderBy(desc(products.stock)),
        db
          .select()
          .from(stockMovements)
          .orderBy(desc(stockMovements.createdAt))
          .limit(50),
        db
          .select()
          .from(stockArrivals)
          .orderBy(desc(stockArrivals.arrivalDate), desc(stockArrivals.createdAt)),
        db
          .select()
          .from(stockArrivalItems)
          .orderBy(stockArrivalItems.createdAt),
      ]);
      return { allProducts, recentMovements, allArrivals, allArrivalItems };
    }),
  ]);

  const { allProducts, recentMovements, allArrivals, allArrivalItems } = stockData;

  const itemsByArrival: Record<string, typeof allArrivalItems> = {};
  for (const item of allArrivalItems) {
    if (!itemsByArrival[item.arrivalId]) {
      itemsByArrival[item.arrivalId] = [];
    }
    itemsByArrival[item.arrivalId].push(item);
  }

  const arrivalsWithItems = allArrivals.map((a) => ({
    ...a,
    items: itemsByArrival[a.id] || [],
  }));

  return (
    <AdminStockView
      products={allProducts}
      movements={recentMovements}
      arrivals={arrivalsWithItems}
      lowStockThreshold={settings?.lowStockThreshold || 3}
      currency={settings?.currency || "XOF"}
      locale={settings?.locale || "fr-FR"}
    />
  );
}
