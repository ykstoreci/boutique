import { getDb } from "@/db";
import {
  products,
  productImages,
  productVariants,
  productRelations,
  categories,
  shippingZones,
  storeSettings,
} from "@/db/schema";
import { getPublishedTheme } from "@/lib/theme/render";
import { ProductGallery } from "@/components/store/ProductGallery";
import { ProductCheckoutForm } from "@/components/store/ProductCheckoutForm";
import { ProductCard } from "@/components/store/ProductCard";
import { formatMoney, effectivePrice } from "@/lib/money";
import { eq, and, ne, sql, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const theme = await getPublishedTheme();
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  const currency = settings?.currency || "XOF";
  const locale = settings?.locale || "fr-FR";

  // Charger le produit
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      reference: products.reference,
      description: products.description,
      price: products.price,
      promoPrice: products.promoPrice,
      categoryId: products.categoryId,
      stock: products.stock,
      trackStock: products.trackStock,
      specs: products.specs,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.status, "published")))
    .limit(1);

  if (!product) {
    notFound();
  }

  // Images du produit
  const images = await db
    .select({
      storageKey: productImages.storageKey,
      alt: productImages.alt,
      isMain: productImages.isMain,
    })
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(sql`${productImages.isMain} DESC`, productImages.position);

  // Variantes du produit
  const variants = await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      price: productVariants.price,
      stock: productVariants.stock,
    })
    .from(productVariants)
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
    .orderBy(productVariants.position);

  // Zones de livraison configurées
  const activeDeliveryZones = await db
    .select({ name: shippingZones.name, fee: shippingZones.fee })
    .from(shippingZones)
    .where(and(eq(shippingZones.type, "delivery"), eq(shippingZones.isActive, true)))
    .orderBy(shippingZones.position);

  // Zones d'expédition configurées
  const activeShippingZones = await db
    .select({ name: shippingZones.name, fee: shippingZones.fee })
    .from(shippingZones)
    .where(and(eq(shippingZones.type, "shipping"), eq(shippingZones.isActive, true)))
    .orderBy(shippingZones.position);

  // 10. PRODUITS SIMILAIRES (Priorité : 1. Même catégorie, 2. Produits associés configurés, 3. Autres publiés)
  let similarProductsList: {
    id: string;
    name: string;
    slug: string;
    price: number;
    promoPrice: number | null;
    categoryName: string | null;
    stock: number;
    trackStock: boolean;
    imageKey: string | null;
  }[] = [];

  if (theme.settings.product.showSimilar) {
    const limitCount = theme.settings.product.similarCount || 4;

    // Étape 1 : Même catégorie
    if (product.categoryId) {
      similarProductsList = await db
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
            eq(products.categoryId, product.categoryId),
            eq(products.status, "published"),
            ne(products.id, product.id)
          )
        )
        .limit(limitCount);
    }

    // Étape 2 : Si pas assez, ajouter les produits associés configurés
    if (similarProductsList.length < limitCount) {
      const existingIds = [product.id, ...similarProductsList.map((p) => p.id)];
      const related = await db
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
        .from(productRelations)
        .innerJoin(products, eq(productRelations.relatedProductId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(productRelations.productId, product.id),
            eq(products.status, "published"),
            sql`${products.id} NOT IN (${sql.join(existingIds.map((id) => sql`${id}`), sql`, `)})`
          )
        )
        .limit(limitCount - similarProductsList.length);

      similarProductsList.push(...related);
    }

    // Étape 3 : Si toujours pas assez, autres produits publiés
    if (similarProductsList.length < limitCount) {
      const existingIds = [product.id, ...similarProductsList.map((p) => p.id)];
      const others = await db
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
            sql`${products.id} NOT IN (${sql.join(existingIds.map((id) => sql`${id}`), sql`, `)})`
          )
        )
        .limit(limitCount - similarProductsList.length);

      similarProductsList.push(...others);
    }
  }

  const isPromo = product.promoPrice !== null && product.promoPrice < product.price;
  const currentPrice = effectivePrice(product.price, product.promoPrice);
  const mainImage = images[0]?.storageKey || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Fil d'Ariane */}
      <nav className="text-xs text-[var(--theme-muted)] mb-4 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:underline">Accueil</Link>
        <span>/</span>
        <Link href="/catalogue" className="hover:underline">Catalogue</Link>
        {product.categoryName && product.categorySlug && (
          <>
            <span>/</span>
            <Link href={`/categories/${product.categorySlug}`} className="hover:underline">
              {product.categoryName}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="font-semibold text-[var(--theme-text)] truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* DISPOSITION DESKTOP ET MOBILE (Ordre strict des éléments respecté) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLONNE GAUCHE (Bureau) : IMAGES */}
        <div className="lg:col-span-6 lg:sticky lg:top-24">
          {/* 1. IMAGE PRINCIPALE & 2. GALERIE */}
          <ProductGallery
            images={images}
            productName={product.name}
            aspectRatio={theme.settings.product.imageAspect}
          />
        </div>

        {/* COLONNE DROITE (Bureau) OU SUITE DIRECTE (Mobile) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Catégorie */}
          {product.categoryName && (
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {product.categoryName}
            </span>
          )}

          {/* 3. NOM DU PRODUIT */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--theme-text)] leading-tight">
            {product.name}
          </h1>

          {/* Référence si configurée */}
          {product.reference && (
            <span className="text-xs text-[var(--theme-muted)] font-mono block">
              RÉF : {product.reference}
            </span>
          )}

          {/* 4. PRIX DU PRODUIT */}
          <div className="flex items-baseline gap-3 pt-1">
            <span className="text-2xl sm:text-3xl font-black text-[var(--theme-price)]">
              {formatMoney(currentPrice, currency, locale)}
            </span>
            {isPromo && (
              <span className="text-base line-through text-[var(--theme-muted)]">
                {formatMoney(product.price, currency, locale)}
              </span>
            )}
            {isPromo && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-[var(--theme-sale)] text-white">
                PROMOTION
              </span>
            )}
          </div>

          {/* Indication de stock si activée dans le thème */}
          {theme.settings.product.showStock && product.trackStock && (
            <div className="text-xs font-medium">
              {product.stock > 0 ? (
                <span className="text-emerald-700">✓ En stock ({product.stock} disponible{product.stock > 1 ? "s" : ""})</span>
              ) : (
                <span className="text-red-600 font-bold">Rupture de stock</span>
              )}
            </div>
          )}

          {/* 5. DESCRIPTION DU PRODUIT */}
          {product.description && product.description.trim() !== "" && (
            <div className="pt-2 border-t border-[var(--theme-border)]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)] mb-2">
                Description
              </h2>
              <div className="text-sm leading-relaxed text-[var(--theme-text)] opacity-90 whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* Caractéristiques techniques éventuelles */}
          {product.specs && product.specs.length > 0 && (
            <div className="pt-2 border-t border-[var(--theme-border)] space-y-1.5 text-xs">
              <h2 className="font-bold uppercase tracking-wider text-[var(--theme-muted)] mb-1">
                Caractéristiques
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {product.specs.map((sp, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[var(--theme-surface)]">
                    <span className="text-[var(--theme-muted)] block text-[11px]">{sp.label}</span>
                    <span className="font-semibold block truncate">{sp.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6, 7, 8, 9. FORMULAIRE DE COMMANDE EN UNE SEULE PAGE SOUS LE PRODUIT */}
          <ProductCheckoutForm
            product={{
              id: product.id,
              name: product.name,
              price: product.price,
              promoPrice: product.promoPrice,
              stock: product.stock,
              trackStock: product.trackStock,
            }}
            variants={variants}
            mainImageKey={mainImage}
            deliveryZones={activeDeliveryZones}
            shippingZones={activeShippingZones}
            defaultDeliveryFee={settings?.defaultDeliveryFee ?? null}
            defaultShippingFee={settings?.defaultShippingFee ?? null}
            deliveryEnabled={settings?.deliveryEnabled !== false}
            shippingEnabled={settings?.shippingEnabled !== false}
            ordersEnabled={settings?.ordersEnabled === true}
            currency={currency}
            locale={locale}
          />

          {/* Informations complémentaires sur la livraison configurées par le propriétaire */}
          {settings?.deliveryInfo && settings.deliveryInfo.trim() !== "" && (
            <div className="mt-4 p-3.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900 leading-relaxed">
              <span className="font-bold block mb-0.5">ℹ️ Modalités de livraison :</span>
              {settings.deliveryInfo}
            </div>
          )}
        </div>
      </div>

      {/* 10. PRODUITS SIMILAIRES (Masqué s'il n'en existe aucun) */}
      {similarProductsList.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[var(--theme-border)]">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-6">
            {theme.settings.product.similarTitle || "Vous aimerez aussi"}
          </h2>
          <div
            className={`grid grid-cols-${theme.settings.catalog.mobileColumns} md:grid-cols-4 gap-3 sm:gap-5`}
          >
            {similarProductsList.map((sim) => (
              <ProductCard
                key={sim.id}
                product={sim}
                settings={theme.settings}
                currency={currency}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

