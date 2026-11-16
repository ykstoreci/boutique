import { getDb } from "@/db";
import { categories, products } from "@/db/schema";
import { getImageUrl } from "@/lib/storage";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  let allCategories: any[] = [];

  try {
    const db = await getDb();
    allCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageKey: categories.imageKey,
        productCount: sql<number>`(
          SELECT count(*) FROM products
          WHERE products.category_id = ${categories.id}
          AND products.status = 'published'
        )`,
      })
      .from(categories)
      .where(eq(categories.isPublished, true))
      .orderBy(categories.position);
  } catch (err) {
    console.warn("CategoriesPage: BDD en cours d'initialisation :", err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Catégories</h1>
        <p className="text-xs sm:text-sm text-[var(--theme-muted)] mt-1">
          Explorez nos collections
        </p>
      </div>

      {allCategories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {allCategories.map((c) => {
            const img = getImageUrl(c.imageKey, "medium");
            return (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group block rounded-[var(--theme-radius-card)] overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:shadow-md transition-all"
              >
                <div className="aspect-square bg-black/5 relative overflow-hidden">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-black/20 uppercase">
                      {c.name.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4 text-center">
                  <h2 className="font-bold text-sm sm:text-base group-hover:underline truncate">
                    {c.name}
                  </h2>
                  <span className="text-xs text-[var(--theme-muted)] block mt-0.5">
                    {c.productCount} article{c.productCount > 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center max-w-md mx-auto">
          <p className="text-sm text-[var(--theme-muted)] mb-4">
            Aucune catégorie n&apos;est disponible pour le moment.
          </p>
          <Link
            href="/catalogue"
            className="inline-flex px-4 py-2 rounded-lg text-xs font-semibold border border-current hover:bg-black/5"
          >
            Voir tous les produits
          </Link>
        </div>
      )}
    </div>
  );
}
