import Link from "next/link";
import { type ThemeSection, type ThemeSettings } from "@/lib/theme/schema";
import { ProductCard, type ProductCardData } from "./ProductCard";
import { getImageUrl } from "@/lib/images";

export function HomeSection({
  section,
  themeSettings,
  data,
  currency,
  locale,
}: {
  section: ThemeSection;
  themeSettings: ThemeSettings;
  data: {
    categories?: { id: string; name: string; slug: string; imageKey?: string | null }[];
    products?: ProductCardData[];
    socialLinks?: Record<string, string>;
  };
  currency: string;
  locale: string;
}) {
  if (!section.isEnabled) return null;

  const s = section.settings as Record<string, unknown>;
  const paddingClass =
    s.paddingY === "none"
      ? "py-0"
      : s.paddingY === "sm"
      ? "py-6 sm:py-8"
      : s.paddingY === "lg"
      ? "py-14 sm:py-20"
      : "py-10 sm:py-14";

  // 1. BANNIÈRE PRINCIPALE (HERO)
  if (section.type === "hero") {
    const heroImg = getImageUrl(s.imageKey as string, "large");
    const title = (s.title as string) || "";
    const subtitle = (s.subtitle as string) || "";
    const buttonLabel = (s.buttonLabel as string) || "";
    const buttonHref = (s.buttonHref as string) || "/catalogue";

    if (!heroImg && !title && !subtitle) return null;

    const heightClass =
      s.height === "sm"
        ? "min-h-[260px] sm:min-h-[340px]"
        : s.height === "lg"
        ? "min-h-[440px] sm:min-h-[600px]"
        : "min-h-[320px] sm:min-h-[460px]";

    return (
      <section className={`relative w-full overflow-hidden flex items-center ${heightClass} ${paddingClass}`}>
        {heroImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImg}
            alt={title || "Bannière"}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        )}
        {/* Overlay pour lisibilité */}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: ((s.overlay as number) || 35) / 100 }}
        />
        <div
          className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full text-${
            s.align === "left" ? "left" : "center"
          }`}
          style={{ color: (s.textColor as string) || "#ffffff" }}
        >
          {title && (
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-3xl leading-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-3 text-sm sm:text-lg max-w-2xl opacity-90 leading-relaxed mx-auto">
              {subtitle}
            </p>
          )}
          {buttonLabel && (
            <div className="mt-6">
              <Link
                href={buttonHref}
                className="inline-flex items-center justify-center px-6 py-3 rounded-[var(--theme-radius-btn)] font-semibold text-sm bg-white text-black shadow-md hover:bg-gray-100 transition-all active:scale-95"
              >
                {buttonLabel}
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  // 2. TEXTE DE PRÉSENTATION
  if (section.type === "text") {
    const title = (s.title as string) || "";
    const body = (s.body as string) || "";
    if (!title && !body) return null;

    return (
      <section className={`${paddingClass} px-4 sm:px-6 max-w-4xl mx-auto text-${s.align === "left" ? "left" : "center"}`}>
        {title && <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">{title}</h2>}
        {body && <p className="text-sm sm:text-base leading-relaxed opacity-80 whitespace-pre-line">{body}</p>}
      </section>
    );
  }

  // 3. CATÉGORIES
  if (section.type === "categories") {
    const categoriesList = data.categories || [];
    if (categoriesList.length === 0) return null;

    const title = (s.title as string) || "Catégories";
    const layout = (s.layout as string) || "scroll";

    return (
      <section className={`${paddingClass} max-w-7xl mx-auto px-4 sm:px-6`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
          <Link href="/categories" className="text-xs font-semibold text-[var(--theme-primary)] hover:underline">
            Tout voir &rarr;
          </Link>
        </div>

        {layout === "scroll" ? (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x">
            {categoriesList.map((cat) => {
              const catImg = getImageUrl(cat.imageKey, "thumbnail");
              return (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="flex-shrink-0 w-28 sm:w-36 snap-start group text-center"
                >
                  <div className="w-full aspect-square rounded-[var(--theme-radius-card)] bg-black/5 overflow-hidden mb-2 border border-[var(--theme-border)]">
                    {catImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={catImg}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-lg text-black/30 uppercase">
                        {cat.name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold truncate block group-hover:underline">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {categoriesList.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group p-3 rounded-[var(--theme-radius-card)] bg-[var(--theme-surface)] border border-[var(--theme-border)] text-center hover:opacity-90 transition-opacity"
              >
                <span className="text-xs sm:text-sm font-semibold block truncate">{cat.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  // 4, 5, 6, 7. PRODUITS (NOUVEAUTÉS, POPULAIRES, PROMOTIONS, SÉLECTION)
  if (
    section.type === "new_products" ||
    section.type === "popular_products" ||
    section.type === "promo_products" ||
    section.type === "product_selection"
  ) {
    const productsList = data.products || [];
    if (productsList.length === 0) return null;

    const title = (s.title as string) || "Produits";
    const layout = (s.layout as string) || "grid";

    return (
      <section className={`${paddingClass} max-w-7xl mx-auto px-4 sm:px-6`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
          <Link href="/catalogue" className="text-xs font-semibold text-[var(--theme-primary)] hover:underline">
            Voir le catalogue &rarr;
          </Link>
        </div>

        {layout === "scroll" ? (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x">
            {productsList.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-36 sm:w-56 snap-start">
                <ProductCard product={p} settings={themeSettings} currency={currency} locale={locale} />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-${themeSettings.catalog.mobileColumns} md:grid-cols-${themeSettings.catalog.desktopColumns} gap-3 sm:gap-5`}>
            {productsList.map((p) => (
              <ProductCard key={p.id} product={p} settings={themeSettings} currency={currency} locale={locale} />
            ))}
          </div>
        )}
      </section>
    );
  }

  // 8. INFORMATIONS DE LIVRAISON
  if (section.type === "delivery_info") {
    const items = (s.items as { title: string; text: string }[]) || [];
    if (items.length === 0) return null;

    return (
      <section className={`${paddingClass} max-w-7xl mx-auto px-4 sm:px-6`}>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4 sm:mb-6">
          {(s.title as string) || "Livraison"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it, idx) => (
            <div key={idx} className="p-4 rounded-[var(--theme-radius-card)] bg-[var(--theme-surface)] border border-[var(--theme-border)]">
              <h3 className="text-sm font-bold mb-1">{it.title}</h3>
              <p className="text-xs sm:text-sm opacity-80 leading-relaxed">{it.text}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // 9. PRÉSENTATION DE LA BOUTIQUE (ABOUT)
  if (section.type === "about") {
    const title = (s.title as string) || "";
    const body = (s.body as string) || "";
    const imgUrl = getImageUrl(s.imageKey as string, "large");

    if (!title && !body && !imgUrl) return null;

    return (
      <section className={`${paddingClass} max-w-7xl mx-auto px-4 sm:px-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {imgUrl && (
            <div className={`rounded-[var(--theme-radius-card)] overflow-hidden ${s.imagePosition === "right" ? "md:order-2" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt={title || "À propos"} className="w-full h-auto object-cover max-h-[420px]" />
            </div>
          )}
          <div className="space-y-3">
            {title && <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>}
            {body && <p className="text-sm sm:text-base leading-relaxed opacity-80 whitespace-pre-line">{body}</p>}
          </div>
        </div>
      </section>
    );
  }

  // 10. RÉSEAUX SOCIAUX
  if (section.type === "social") {
    const socials = Object.entries(data.socialLinks || {}).filter(
      ([, url]) => typeof url === "string" && url.trim().length > 0
    );
    if (socials.length === 0) return null;

    return (
      <section className={`${paddingClass} max-w-7xl mx-auto px-4 sm:px-6 text-center`}>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4">
          {(s.title as string) || "Suivez-nous"}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {socials.map(([net, url]) => (
            <a
              key={net}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-black/5 capitalize transition-all"
            >
              {net}
            </a>
          ))}
        </div>
      </section>
    );
  }

  return null;
}
