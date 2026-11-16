import { getDb } from "@/db";
import { products, categories, storeSettings } from "@/db/schema";
import { getPublishedTheme } from "@/lib/theme/render";
import { ProductCard } from "@/components/store/ProductCard";
import { SortSelect } from "@/components/store/SortSelect";
import { eq, and, desc, asc, sql, ilike } from "drizzle-orm";
import Link from "next/link";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; sort?: string; q?: string }>;
}) {
  const { cat, sort, q } = await searchParams;
  const db = await getDb();
  const theme = await getPublishedTheme();
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  const currency = settings?.currency || "XOF";
  const locale = settings?.locale || "fr-FR";

  // Charger toutes les catégories actives pour les filtres
  const allCategories = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.isPublished, true))
    .orderBy(categories.position);

  // Construire la requête filtrée
  const conditions = [eq(products.status, "published")];

  let selectedCategory: { id: string; name: string; slug: string } | null = null;
  if (cat) {
    const found = allCategories.find((c) => c.slug === cat);
    if (found) {
      selectedCategory = found;
      conditions.push(eq(products.categoryId, found.id));
    }
  }

  // Recherche textuelle (uniquement si q est passé, ex. depuis la recherche desktop)
  if (q && q.trim()) {
    conditions.push(ilike(products.name, `%${q.trim()}%`));
  }

  // Tri
  let orderByClause = desc(products.publishedAt);
  if (sort === "price_asc") {
    orderByClause = asc(products.price);
  } else if (sort === "price_desc") {
    orderByClause = desc(products.price);
  } else if (sort === "name") {
    orderByClause = asc(products.name);
  }

  const catalogProducts = await db
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
    .where(and(...conditions))
    .orderBy(orderByClause);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* En-tête du catalogue */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {selectedCategory ? selectedCategory.name : q ? `Résultats pour « ${q} »` : "Notre Catalogue"}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--theme-muted)] mt-1">
          {catalogProducts.length} article{catalogProducts.length > 1 ? "s" : ""} disponible{catalogProducts.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Barre de filtres par catégories (Navigation fluide sur mobile sans barre de recherche) */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <Link
          href="/catalogue"
          className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            !selectedCategory
              ? "bg-[var(--theme-primary)] text-[var(--theme-primary-text)] shadow-xs"
              : "bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-black/5"
          }`}
        >
          Tous les articles
        </Link>
        {allCategories.map((c) => (
          <Link
            key={c.id}
            href={`/catalogue?cat=${c.slug}${sort ? `&sort=${sort}` : ""}`}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              selectedCategory?.slug === c.slug
                ? "bg-[var(--theme-primary)] text-[var(--theme-primary-text)] shadow-xs"
                : "bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-black/5"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Sélecteur de tri */}
      <div className="flex justify-end mb-6">
        <SortSelect currentSort={sort} cat={cat} q={q} />
      </div>

      {/* Grille de produits */}
      {catalogProducts.length > 0 ? (
        <div
          className={`grid grid-cols-${theme.settings.catalog.mobileColumns} md:grid-cols-${theme.settings.catalog.desktopColumns} gap-3 sm:gap-5`}
        >
          {catalogProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              settings={theme.settings}
              currency={currency}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center max-w-md mx-auto">
          <p className="text-sm text-[var(--theme-muted)] mb-4">
            Aucun article ne correspond à cette sélection.
          </p>
          <Link
            href="/catalogue"
            className="inline-flex px-4 py-2 rounded-lg text-xs font-semibold border border-current hover:bg-black/5"
          >
            Voir tous les articles
          </Link>
        </div>
      )}
    </div>
  );
}
