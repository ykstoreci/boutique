import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  cachedQuery,
  getCachedStoreSettings,
  getCachedPublishedCategories,
} from "@/lib/cache";
import {
  products,
  categories,
} from "@/db/schema";
import { getDraftTheme } from "@/lib/theme/render";
import { type ThemeSection } from "@/lib/theme/schema";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { HomeSection } from "@/components/store/HomeSection";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ThemePreviewPage() {
  const admin = await getCurrentAdmin();
  

  const [draft, settings, activeCategories, realProducts] = await Promise.all([
    getDraftTheme(),
    getCachedStoreSettings(),
    getCachedPublishedCategories(),
    cachedQuery("store:previewProducts", 10_000, async () => {
      const db = await getDb();
      return db
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
        .orderBy(desc(products.publishedAt))
        .limit(16);
    }),
  ]);

  const currency = settings?.currency || "XOF";
  const locale = settings?.locale || "fr-FR";

  const enabledSections = draft.snapshot.sections.filter((s: ThemeSection) => s.isEnabled);

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--theme-background)] text-[var(--theme-text)]"
      style={{
        // @ts-expect-error CSS variable injection
        "--theme-primary": draft.snapshot.settings.colors.primary,
        "--theme-primary-text": draft.snapshot.settings.colors.primaryText,
        "--theme-secondary": draft.snapshot.settings.colors.secondary,
        "--theme-background": draft.snapshot.settings.colors.background,
        "--theme-surface": draft.snapshot.settings.colors.surface,
        "--theme-text": draft.snapshot.settings.colors.text,
        "--theme-muted": draft.snapshot.settings.colors.muted,
        "--theme-border": draft.snapshot.settings.colors.border,
        "--theme-price": draft.snapshot.settings.colors.price,
        "--theme-sale": draft.snapshot.settings.colors.sale,
        "--theme-radius-btn": `${draft.snapshot.settings.shape.buttonRadius}px`,
        "--theme-radius-card": `${draft.snapshot.settings.shape.cardRadius}px`,
      }}
    >
      <StoreHeader
        storeName={settings?.storeName || ""}
        logoKey={settings?.logoKey}
        settings={draft.snapshot.settings}
        categories={activeCategories}
      />

      <main className="flex-1 pb-16">
        {enabledSections.length === 0 ? (
          <div className="max-w-md mx-auto my-16 p-8 text-center bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)]">
            <p className="text-sm text-[var(--theme-muted)]">
              Toutes les sections sont actuellement désactivées. Activez-les dans l&apos;éditeur à gauche pour les prévisualiser.
            </p>
          </div>
        ) : (
          enabledSections.map((sec: ThemeSection) => (
            <HomeSection
              key={sec.id}
              section={sec}
              themeSettings={draft.snapshot.settings}
              data={{
                categories: activeCategories,
                products: realProducts,
                socialLinks: settings?.socialLinks,
              }}
              currency={currency}
              locale={locale}
            />
          ))
        )}
      </main>

      <StoreFooter
        storeName={settings?.storeName || ""}
        settings={draft.snapshot.settings}
        socialLinks={settings?.socialLinks || {}}
        systemPages={[]}
      />
    </div>
  );
}
