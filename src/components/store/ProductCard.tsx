import Link from "next/link";
import { formatMoney, effectivePrice } from "@/lib/money";
import { getImageUrl } from "@/lib/images";
import { type ThemeSettings } from "@/lib/theme/schema";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  promoPrice?: number | null;
  imageKey?: string | null;
  categoryName?: string | null;
  stock?: number;
  trackStock?: boolean;
};

export function ProductCard({
  product,
  settings,
  currency = "XOF",
  locale = "fr-FR",
}: {
  product: ProductCardData;
  settings: ThemeSettings;
  currency?: string;
  locale?: string;
}) {
  const isPromo = product.promoPrice !== null && product.promoPrice !== undefined && product.promoPrice < product.price;
  const currentPrice = effectivePrice(product.price, product.promoPrice);
  const imageUrl = getImageUrl(product.imageKey, "thumbnail") || getImageUrl(product.imageKey, "medium");

  const aspectClass =
    settings.catalog.imageAspect === "square"
      ? "aspect-square"
      : settings.catalog.imageAspect === "landscape"
      ? "aspect-video"
      : "aspect-[3/4]";

  const isCard = settings.catalog.cardStyle === "card";

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group block overflow-hidden transition-all duration-200 ${
        isCard
          ? "bg-[var(--theme-surface)] rounded-[var(--theme-radius-card)] p-2 sm:p-3 border border-[var(--theme-border)] shadow-xs hover:shadow-md"
          : "hover:opacity-95"
      }`}
    >
      {/* Conteneur d'image */}
      <div
        className={`relative w-full ${aspectClass} overflow-hidden rounded-[var(--theme-radius-card)] bg-black/5`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 text-xs p-4 text-center">
            <svg className="w-8 h-8 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Sans photo</span>
          </div>
        )}

        {/* Badge Promotion */}
        {isPromo && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[11px] font-bold rounded-md bg-[var(--theme-sale)] text-white shadow-xs">
            PROMO
          </span>
        )}
      </div>

      {/* Informations produit */}
      <div className="mt-2.5 space-y-1">
        {product.categoryName && (
          <span className="text-[11px] font-medium text-[var(--theme-muted)] tracking-wider uppercase block truncate">
            {product.categoryName}
          </span>
        )}

        <h3 className="text-sm font-semibold tracking-tight text-[var(--theme-text)] line-clamp-2 group-hover:underline">
          {product.name}
        </h3>

        {/* Prix */}
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="font-bold text-sm sm:text-base text-[var(--theme-price)]">
            {formatMoney(currentPrice, currency, locale)}
          </span>
          {isPromo && (
            <span className="text-xs line-through text-[var(--theme-muted)]">
              {formatMoney(product.price, currency, locale)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
