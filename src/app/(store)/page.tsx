import { getDb } from "@/db";
import {
  products,
  categories,
  orderItems,
} from "@/db/schema";
import { getPublishedTheme } from "@/lib/theme/render";
import {
  cachedQuery,
  getCachedStoreSettings,
  getCachedPublishedCategories,
} from "@/lib/cache";
import { type ThemeSection } from "@/lib/theme/schema";
import { HomeSection } from "@/components/store/HomeSection";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let currency = "XOF";
  let locale = "fr-FR";
  let activeCategories: any[] = [];
  let newProductsRaw: any[] = [];
  let promoProductsRaw: any[] = [];
  let popularProducts: any[] = [];
  let enabledSections: any[] = [];
  let theme: any = { settings: {}, sections: [] };
  let settings: any = null;

  try {
    const [resolvedTheme, resolvedSettings, resolvedCategories, homeData] = await Promise.all([
      getPublishedTheme(),
      getCachedStoreSettings(),
      getCachedPublishedCategories(),
      cachedQuery("store:homeProducts", 15_000, async () => {
        const db = await getDb();
        const [newProds, promoProds, popularRaw] = await Promise.all([
          db
            .select({
              id: products.id,
              name: products.name,
              slug: products.slug,
              price: products.price,
              promoPrice: products.promoPrice,
              categoryName: categories.name,
              stock: products.stock,
              trackStock: products.trackStock,
              imageKey: sql<string>`(
                SELECT storage_key FROM product_images
                WHERE product_images.product_id = ${products.id}
                ORDER BY is_main DESC, position ASC
                LIMIT 1
              )`,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(eq(products.status, "published"))
            .orderBy(desc(products.publishedAt), desc(products.createdAt))
            .limit(16),
          db
            .select({
              id: products.id,
              name: products.name,
              slug: products.slug,
              price: products.price,
              promoPrice: products.promoPrice,
              categoryName: categories.name,
              stock: products.stock,
              trackStock: products.trackStock,
              imageKey: sql<string>`(
                SELECT storage_key FROM product_images
                WHERE product_images.product_id = ${products.id}
                ORDER BY is_main DESC, position ASC
                LIMIT 1
              )`,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(
              and(
                eq(products.status, "published"),
                sql`${products.promoPrice} IS NOT NULL AND ${products.promoPrice} < ${products.price}`
              )
            )
            .orderBy(desc(products.publishedAt))
            .limit(16),
          db
            .select({
              productId: orderItems.productId,
              totalSold: sql<number>`sum(${orderItems.quantity})`,
            })
            .from(orderItems)
            .groupBy(orderItems.productId)
            .orderBy(desc(sql`sum(${orderItems.quantity})`))
            .limit(12),
        ]);

        const popularIds = popularRaw.map((p) => p.productId).filter((id): id is string => !!id);
        const popProds =
          popularIds.length > 0
            ? await db
                .select({
                  id: products.id,
                  name: products.name,
                  slug: products.slug,
                  price: products.price,
                  promoPrice: products.promoPrice,
                  categoryName: categories.name,
                  stock: products.stock,
                  trackStock: products.trackStock,
                  imageKey: sql<string>`(
                    SELECT storage_key FROM product_images
                    WHERE product_images.product_id = ${products.id}
                    ORDER BY is_main DESC, position ASC
                    LIMIT 1
                  )`,
                })
                .from(products)
                .leftJoin(categories, eq(products.categoryId, categories.id))
                .where(and(eq(products.status, "published"), inArray(products.id, popularIds)))
                .limit(12)
            : [];

        return { newProds, promoProds, popProds };
      }),
    ]);

    theme = resolvedTheme;
    settings = resolvedSettings;
    currency = settings?.currency || "XOF";
    locale = settings?.locale || "fr-FR";
    activeCategories = resolvedCategories;
    newProductsRaw = homeData.newProds;
    promoProductsRaw = homeData.promoProds;
    popularProducts = homeData.popProds;
    enabledSections = (theme.sections || []).filter((s: ThemeSection) => s.isEnabled);
  } catch (err) {
    console.warn("HomePage: BDD en cours d'initialisation :", err);
  }

  return (
    <div className="w-full pb-16">
      {enabledSections.length > 0 ? (
        enabledSections.map((sec: ThemeSection) => (
          <HomeSection
            key={sec.id}
            section={sec}
            themeSettings={theme.settings}
            data={{
              categories: activeCategories,
              products:
                sec.type === "new_products"
                  ? newProductsRaw
                  : sec.type === "promo_products"
                  ? promoProductsRaw
                  : sec.type === "popular_products"
                  ? popularProducts
                  : newProductsRaw,
              socialLinks: settings?.socialLinks,
            }}
            currency={currency}
            locale={locale}
          />
        ))
      ) : null}

      {/* État vide propre si aucun produit n'a encore été publié par le propriétaire */}
      {newProductsRaw.length === 0 && (
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/5 flex items-center justify-center text-muted-foreground">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Bienvenue dans notre boutique</h2>
          <p className="text-sm opacity-70 mb-6 leading-relaxed">
            Notre catalogue est en cours d&apos;approvisionnement. Revenez très bientôt pour découvrir nos nouveaux articles.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border border-current hover:bg-black/5 transition-colors"
          >
            Nous contacter
          </Link>
        </div>
      )}
    </div>
  );
}
