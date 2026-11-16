import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { products, categories, productImages } from "@/db/schema";
import { getCachedStoreSettings, cachedQuery } from "@/lib/cache";
import { formatMoney } from "@/lib/money";
import { getImageUrl } from "@/lib/storage";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const admin = await getCurrentAdmin();
  

  const [settings, data] = await Promise.all([
    getCachedStoreSettings(),
    cachedQuery("admin:products:list", 15_000, async () => {
      const db = await getDb();
      const [allCategories, allProducts] = await Promise.all([
        db.select().from(categories).orderBy(categories.position),
        db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            reference: products.reference,
            price: products.price,
            promoPrice: products.promoPrice,
            stock: products.stock,
            trackStock: products.trackStock,
            status: products.status,
            categoryName: categories.name,
            imageKey: sql<string>`(
              SELECT storage_key FROM product_images
              WHERE product_images.product_id = ${products.id}
              ORDER BY is_main DESC, position ASC
              LIMIT 1
            )`,
          })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .orderBy(desc(products.createdAt)),
      ]);
      return { allCategories, allProducts };
    }),
  ]);

  const { allCategories, allProducts } = data;
  const currency = settings?.currency || "XOF";
  const locale = settings?.locale || "fr-FR";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Catalogue & Articles</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {allProducts.length} article{allProducts.length > 1 ? "s" : ""} enregistré{allProducts.length > 1 ? "s" : ""}
          </p>
        </div>

        <Link
          href="/boutick/products/new"
          className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 active:scale-98 transition-all inline-flex items-center gap-1.5 self-start"
        >
          <span>+ Ajouter un article</span>
        </Link>
      </div>

      {/* Tableau des produits */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {allProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Prix</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allProducts.map((p) => {
                  const img = getImageUrl(p.imageKey, "thumbnail");
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                Sans photo
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate max-w-xs">{p.name}</span>
                            {p.reference && (
                              <span className="text-gray-400 font-mono text-[11px] block">{p.reference}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{p.categoryName || "—"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">{formatMoney(p.price, currency, locale)}</span>
                        {p.promoPrice && (
                          <span className="text-[11px] text-red-600 block">
                            Promo : {formatMoney(p.promoPrice, currency, locale)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.trackStock ? (
                          <span
                            className={`font-semibold ${
                              p.stock <= 0
                                ? "text-red-600"
                                : p.stock <= (settings?.lowStockThreshold || 3)
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {p.stock <= 0 ? "Rupture (0)" : `${p.stock} unité${p.stock > 1 ? "s" : ""}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">Non suivi</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "published"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.status === "published" ? "Publié" : "Brouillon"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold"
                        >
                          Aperçu
                        </Link>
                        <Link
                          href={`/boutick/products/${p.id}`}
                          className="px-3 py-1 rounded-lg bg-black text-white hover:bg-gray-800 font-semibold"
                        >
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-xs text-gray-400 space-y-3">
            <p>Aucun article enregistré dans votre catalogue.</p>
            <Link
              href="/boutick/products/new"
              className="px-4 py-2 rounded-xl bg-black text-white font-bold text-xs inline-block"
            >
              + Ajouter votre premier article
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

