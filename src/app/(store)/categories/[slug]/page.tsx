import { getDb } from "@/db";
import { categories, products, storeSettings } from "@/db/schema";
import { getPublishedTheme } from "@/lib/theme/render";
import { ProductCard } from "@/components/store/ProductCard";
import { eq, and, desc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const theme = await getPublishedTheme();
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isPublished, true)))
    .limit(1);

  if (!category) {
    notFound();
  }

  const categoryProducts = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      promoPrice: products.promoPrice,
      categoryName: sql<string>`${category.name}`,
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
    .where(and(eq(products.categoryId, category.id), eq(products.status, "published")))
    .orderBy(desc(products.publishedAt));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Fil d'Ariane */}
      <nav className="text-xs text-[var(--theme-muted)] mb-4 flex items-center gap-1.5">
        <Link href="/" className="hover:underline">Accueil</Link>
        <span>/</span>
        <Link href="/categories" className="hover:underline">Catégories</Link>
        <span>/</span>
        <span className="font-semibold text-[var(--theme-text)]">{category.name}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="text-xs sm:text-sm text-[var(--theme-muted)] mt-1.5 max-w-2xl leading-relaxed">
            {category.description}
          </p>
        )}
      </div>

      {categoryProducts.length > 0 ? (
        <div
          className={`grid grid-cols-${theme.settings.catalog.mobileColumns} md:grid-cols-${theme.settings.catalog.desktopColumns} gap-3 sm:gap-5`}
        >
          {categoryProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              settings={theme.settings}
              currency={settings?.currency || "XOF"}
              locale={settings?.locale || "fr-FR"}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center max-w-md mx-auto">
          <p className="text-sm text-[var(--theme-muted)] mb-4">
            Aucun article n&apos;est actuellement disponible dans cette catégorie.
          </p>
          <Link
            href="/catalogue"
            className="inline-flex px-4 py-2 rounded-lg text-xs font-semibold border border-current hover:bg-black/5"
          >
            Voir tous nos articles
          </Link>
        </div>
      )}
    </div>
  );
}

