/**
 * Modèle du thème : réglages globaux + sections de la page d'accueil.
 * Toutes les valeurs sont validées (Zod) avec des valeurs par défaut sûres :
 * un réglage manquant ou invalide ne peut jamais casser l'affichage de la boutique.
 */
import { z } from "zod";

const color = (def: string) => z.string().regex(/^#[0-9a-fA-F]{6}$/).catch(def).default(def);
const optColor = () => z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/)]).catch("").default("");
const str = (def = "", max = 2000) => z.string().max(max).catch(def).default(def);
const int = (def: number, min: number, max: number) => z.coerce.number().int().min(min).max(max).catch(def).default(def);
const bool = (def: boolean) => z.boolean().catch(def).default(def);
const oneOf = <T extends readonly [string, ...string[]]>(values: T, def: T[number]) => z.enum(values).catch(def).default(def);

/** Lien sûr : chemin interne (/…), https://, mailto: ou tel: — jamais javascript: */
export const safeHref = z
  .string()
  .max(500)
  .refine((v) => v === "" || /^\/(?!\/)/.test(v) || /^https:\/\//i.test(v) || /^(mailto|tel):/i.test(v), "Lien invalide");

export const FONT_OPTIONS = [
  { value: "system", label: "Système (le plus rapide)", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { value: "inter", label: "Inter", stack: "'Inter Variable', system-ui, sans-serif" },
  { value: "dm-sans", label: "DM Sans", stack: "'DM Sans Variable', system-ui, sans-serif" },
  { value: "montserrat", label: "Montserrat", stack: "'Montserrat Variable', system-ui, sans-serif" },
  { value: "nunito", label: "Nunito", stack: "'Nunito Variable', system-ui, sans-serif" },
  { value: "playfair", label: "Playfair Display (élégant)", stack: "'Playfair Display Variable', Georgia, serif" },
  { value: "lora", label: "Lora (classique)", stack: "'Lora Variable', Georgia, serif" },
] as const;
type FontValue = (typeof FONT_OPTIONS)[number]["value"];
const fontValues = FONT_OPTIONS.map((f) => f.value) as unknown as readonly [FontValue, ...FontValue[]];

export const themeSettingsSchema = z.object({
  colors: z.object({
    primary: color("#111111"),
    primaryText: color("#ffffff"),
    secondary: color("#57534e"),
    background: color("#ffffff"),
    surface: color("#f5f5f4"),
    text: color("#111111"),
    muted: color("#6b7280"),
    border: color("#e7e5e4"),
    price: color("#111111"),
    sale: color("#dc2626"),
  }).catch({
    primary: "#111111",
    primaryText: "#ffffff",
    secondary: "#57534e",
    background: "#ffffff",
    surface: "#f5f5f4",
    text: "#111111",
    muted: "#6b7280",
    border: "#e7e5e4",
    price: "#111111",
    sale: "#dc2626",
  }).default({
    primary: "#111111",
    primaryText: "#ffffff",
    secondary: "#57534e",
    background: "#ffffff",
    surface: "#f5f5f4",
    text: "#111111",
    muted: "#6b7280",
    border: "#e7e5e4",
    price: "#111111",
    sale: "#dc2626",
  }),
  typography: z.object({
    headingFont: oneOf(fontValues, "system"),
    bodyFont: oneOf(fontValues, "system"),
    baseSize: int(16, 14, 19),
    headingWeight: oneOf(["500", "600", "700", "800"] as const, "700"),
  }).catch({
    headingFont: "system",
    bodyFont: "system",
    baseSize: 16,
    headingWeight: "700",
  }).default({
    headingFont: "system",
    bodyFont: "system",
    baseSize: 16,
    headingWeight: "700",
  }),
  shape: z.object({
    buttonRadius: int(12, 0, 999),
    cardRadius: int(12, 0, 32),
    inputRadius: int(10, 0, 24),
    borderWidth: int(1, 0, 3),
    buttonStyle: oneOf(["solid", "outline", "soft"] as const, "solid"),
    buttonUppercase: bool(false),
  }).catch({
    buttonRadius: 12,
    cardRadius: 12,
    inputRadius: 10,
    borderWidth: 1,
    buttonStyle: "solid",
    buttonUppercase: false,
  }).default({
    buttonRadius: 12,
    cardRadius: 12,
    inputRadius: 10,
    borderWidth: 1,
    buttonStyle: "solid",
    buttonUppercase: false,
  }),
  spacing: z.object({
    density: oneOf(["compact", "normal", "comfortable"] as const, "normal"),
    containerWidth: int(1200, 960, 1600),
  }).catch({
    density: "normal",
    containerWidth: 1200,
  }).default({
    density: "normal",
    containerWidth: 1200,
  }),
  header: z.object({
    layout: oneOf(["left", "center"] as const, "left"),
    sticky: bool(true),
    showStoreName: bool(true),
    logoHeight: int(36, 20, 80),
    background: optColor(),
    textColor: optColor(),
    announcement: str("", 200),
    announcementBackground: optColor(),
    announcementTextColor: optColor(),
  }).catch({
    layout: "left",
    sticky: true,
    showStoreName: true,
    logoHeight: 36,
    background: "",
    textColor: "",
    announcement: "",
    announcementBackground: "",
    announcementTextColor: "",
  }).default({
    layout: "left",
    sticky: true,
    showStoreName: true,
    logoHeight: 36,
    background: "",
    textColor: "",
    announcement: "",
    announcementBackground: "",
    announcementTextColor: "",
  }),
  menu: z.object({
    showCategories: bool(true),
    links: z
      .array(z.object({ label: z.string().min(1).max(60), href: safeHref }))
      .max(12)
      .catch([])
      .default([]),
  }).catch({
    showCategories: true,
    links: [],
  }).default({
    showCategories: true,
    links: [],
  }),
  footer: z.object({
    background: optColor(),
    textColor: optColor(),
    text: str("", 1000),
    showSocial: bool(true),
    showPages: bool(true),
    showContact: bool(true),
  }).catch({
    background: "",
    textColor: "",
    text: "",
    showSocial: true,
    showPages: true,
    showContact: true,
  }).default({
    background: "",
    textColor: "",
    text: "",
    showSocial: true,
    showPages: true,
    showContact: true,
  }),
  product: z.object({
    imageAspect: oneOf(["square", "portrait", "landscape"] as const, "square"),
    imageFit: oneOf(["cover", "contain"] as const, "cover"),
    gallery: oneOf(["thumbnails", "grid"] as const, "thumbnails"),
    desktopImageWidth: oneOf(["half", "wide"] as const, "half"),
    priceSize: oneOf(["md", "lg", "xl"] as const, "lg"),
    priceColor: oneOf(["price", "primary", "text"] as const, "price"),
    orderButtonColor: oneOf(["whatsapp", "primary", "secondary"] as const, "whatsapp"),
    orderButtonSize: oneOf(["md", "lg"] as const, "lg"),
    formSpacing: oneOf(["compact", "normal", "comfortable"] as const, "normal"),
    descriptionStyle: oneOf(["expanded", "collapsible"] as const, "expanded"),
    showStock: bool(false),
    showSimilar: bool(true),
    similarTitle: str("Vous aimerez aussi", 80),
    similarCount: int(4, 2, 12),
  }).catch({
    imageAspect: "square",
    imageFit: "cover",
    gallery: "thumbnails",
    desktopImageWidth: "half",
    priceSize: "lg",
    priceColor: "price",
    orderButtonColor: "whatsapp",
    orderButtonSize: "lg",
    formSpacing: "normal",
    descriptionStyle: "expanded",
    showStock: false,
    showSimilar: true,
    similarTitle: "Vous aimerez aussi",
    similarCount: 4,
  }).default({
    imageAspect: "square",
    imageFit: "cover",
    gallery: "thumbnails",
    desktopImageWidth: "half",
    priceSize: "lg",
    priceColor: "price",
    orderButtonColor: "whatsapp",
    orderButtonSize: "lg",
    formSpacing: "normal",
    descriptionStyle: "expanded",
    showStock: false,
    showSimilar: true,
    similarTitle: "Vous aimerez aussi",
    similarCount: 4,
  }),
  catalog: z.object({
    mobileColumns: oneOf(["1", "2"] as const, "2"),
    desktopColumns: oneOf(["3", "4", "5"] as const, "4"),
    pageSize: int(24, 8, 60),
    cardStyle: oneOf(["plain", "card"] as const, "plain"),
    imageAspect: oneOf(["square", "portrait", "landscape"] as const, "portrait"),
    defaultSort: oneOf(["newest", "price_asc", "price_desc", "name"] as const, "newest"),
  }).catch({
    mobileColumns: "2",
    desktopColumns: "4",
    pageSize: 24,
    cardStyle: "plain",
    imageAspect: "portrait",
    defaultSort: "newest",
  }).default({
    mobileColumns: "2",
    desktopColumns: "4",
    pageSize: 24,
    cardStyle: "plain",
    imageAspect: "portrait",
    defaultSort: "newest",
  }),
});
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;

export function parseThemeSettings(input: unknown): ThemeSettings {
  return themeSettingsSchema.parse(input && typeof input === "object" ? input : {});
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = parseThemeSettings({});

/* ─────────────────────────── Sections de la page d'accueil ─────────────────────────── */

const common = {
  paddingY: oneOf(["none", "sm", "md", "lg"] as const, "md"),
  background: optColor(),
};
const productListLayout = oneOf(["grid", "scroll"] as const, "grid");
const imageKey = () => z.string().max(300).nullable().catch(null).default(null);

export const sectionSchemas = {
  hero: z.object({
    ...common,
    paddingY: oneOf(["none", "sm", "md", "lg"] as const, "none"),
    title: str("", 160),
    subtitle: str("", 400),
    imageKey: imageKey(),
    buttonLabel: str("", 60),
    buttonHref: safeHref.catch("").default(""),
    align: oneOf(["left", "center"] as const, "center"),
    height: oneOf(["sm", "md", "lg"] as const, "md"),
    overlay: int(35, 0, 85),
    textColor: color("#ffffff"),
  }),
  text: z.object({ ...common, title: str("", 160), body: str("", 5000), align: oneOf(["left", "center"] as const, "center") }),
  categories: z.object({ ...common, title: str("Catégories", 120), layout: oneOf(["grid", "scroll"] as const, "scroll"), showImages: bool(true) }),
  new_products: z.object({ ...common, title: str("Nouveautés", 120), limit: int(8, 2, 24), layout: productListLayout }),
  popular_products: z.object({ ...common, title: str("Les plus demandés", 120), limit: int(8, 2, 24), layout: productListLayout }),
  promo_products: z.object({ ...common, title: str("Promotions", 120), limit: int(8, 2, 24), layout: productListLayout }),
  product_selection: z.object({
    ...common,
    title: str("Notre sélection", 120),
    productIds: z.array(z.string().uuid()).max(24).catch([]).default([]),
    layout: productListLayout,
  }),
  delivery_info: z.object({
    ...common,
    title: str("Livraison", 120),
    items: z
      .array(z.object({ title: z.string().max(80), text: z.string().max(400) }))
      .max(6)
      .catch([])
      .default([]),
  }),
  about: z.object({
    ...common,
    title: str("", 160),
    body: str("", 5000),
    imageKey: imageKey(),
    imagePosition: oneOf(["left", "right"] as const, "left"),
  }),
  social: z.object({ ...common, title: str("Suivez-nous", 120) }),
} as const;

export type SectionType = keyof typeof sectionSchemas;
export const SECTION_TYPES = Object.keys(sectionSchemas) as SectionType[];
export type SectionSettingsMap = { [K in SectionType]: z.infer<(typeof sectionSchemas)[K]> };
export type SectionSettings<T extends SectionType = SectionType> = SectionSettingsMap[T];

export const SECTION_LABELS: Record<SectionType, { label: string; description: string }> = {
  hero: { label: "Bannière principale", description: "Grande image avec titre et bouton" },
  text: { label: "Texte de présentation", description: "Titre et paragraphe libre" },
  categories: { label: "Catégories", description: "Vos catégories publiées" },
  new_products: { label: "Nouveaux produits", description: "Derniers produits publiés" },
  popular_products: { label: "Produits populaires", description: "Les plus commandés (données réelles)" },
  promo_products: { label: "Produits en promotion", description: "Produits ayant un prix promotionnel" },
  product_selection: { label: "Sélection de produits", description: "Produits choisis manuellement" },
  delivery_info: { label: "Informations de livraison", description: "Délais, zones, modalités" },
  about: { label: "Présentation de la boutique", description: "Texte et image" },
  social: { label: "Réseaux sociaux", description: "Liens configurés dans les paramètres" },
};

export type ThemeSection<T extends SectionType = SectionType> = {
  id: string;
  type: T;
  isEnabled: boolean;
  settings: SectionSettings<T>;
};

export function isSectionType(v: unknown): v is SectionType {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(sectionSchemas, v);
}

export function parseSectionSettings<T extends SectionType>(type: T, input: unknown): SectionSettings<T> {
  return sectionSchemas[type].parse(input && typeof input === "object" ? input : {}) as SectionSettings<T>;
}

export type ThemeSnapshot = { settings: ThemeSettings; sections: ThemeSection[] };

export function parseSnapshot(input: unknown): ThemeSnapshot {
  const obj = (input && typeof input === "object" ? input : {}) as { settings?: unknown; sections?: unknown };
  const raw = Array.isArray(obj.sections) ? (obj.sections as Record<string, unknown>[]) : [];
  const sections: ThemeSection[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object" || !isSectionType(s.type)) continue;
    sections.push({
      id: typeof s.id === "string" ? s.id : crypto.randomUUID(),
      type: s.type,
      isEnabled: s.isEnabled !== false,
      settings: parseSectionSettings(s.type, s.settings),
    } as ThemeSection);
  }
  return { settings: parseThemeSettings(obj.settings), sections };
}

/**
 * Sections créées à l'installation : uniquement des blocs dynamiques qui restent
 * masqués automatiquement tant qu'il n'y a pas de contenu réel (aucun texte ni image fictifs).
 */
export const INITIAL_SECTIONS: SectionType[] = [
  "hero",
  "categories",
  "new_products",
  "promo_products",
  "popular_products",
  "about",
  "social",
];

