import { getPublishedTheme } from "@/lib/theme/render";
import { DEFAULT_THEME_SETTINGS, type ThemeSnapshot } from "@/lib/theme/schema";
import {
  getCachedStoreSettings,
  getCachedPublishedCategories,
  getCachedFooterPages,
} from "@/lib/cache";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { AttributionListener } from "@/components/store/AttributionListener";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let settings: { storeName: string; logoKey: string | null; socialLinks: any } | null = null;
  let activeCategories: { id: string; name: string; slug: string }[] = [];
  let footerPages: { slug: string; title: string }[] = [];
  let theme: ThemeSnapshot = { settings: DEFAULT_THEME_SETTINGS, sections: [] };

  try {
    const [resolvedTheme, resolvedSettings, resolvedCategories, resolvedPages] = await Promise.all([
      getPublishedTheme(),
      getCachedStoreSettings(),
      getCachedPublishedCategories(),
      getCachedFooterPages(),
    ]);
    theme = resolvedTheme;
    settings = resolvedSettings;
    activeCategories = resolvedCategories;
    footerPages = resolvedPages;
  } catch (err) {
    console.warn("StoreLayout: BDD non disponible au build ou en cours de connexion :", err);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-background)] text-[var(--theme-text)]">
      <AttributionListener />
      <StoreHeader
        storeName={settings?.storeName || ""}
        logoKey={settings?.logoKey}
        settings={theme.settings}
        categories={activeCategories}
      />
      <main className="flex-1">{children}</main>
      <StoreFooter
        storeName={settings?.storeName || ""}
        settings={theme.settings}
        socialLinks={settings?.socialLinks || {}}
        systemPages={footerPages}
      />
    </div>
  );
}
