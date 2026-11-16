/**
 * Schéma de la base de données (PostgreSQL).
 *
 * Conventions :
 *  - Les montants sont stockés en ENTIERS dans la plus petite unité de la devise
 *    (ex. centimes pour l'EUR, unité pour le XOF qui n'a pas de décimales).
 *  - Les commandes conservent un INSTANTANÉ des produits (nom, référence, prix, image)
 *    afin qu'une modification ultérieure du catalogue ne modifie jamais l'historique.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ───────────────────────────── Administration ───────────────────────────── */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("admin_users_email_uq").on(sql`lower(${t.email})`)]);

export const adminSessions = pgTable("admin_sessions", {
  /** Empreinte SHA-256 du jeton de session (le jeton brut n'est jamais stocké). */
  id: text("id").primaryKey(),
  adminUserId: uuid("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
  createdAt: createdAt(),
}, (t) => [index("admin_sessions_user_idx").on(t.adminUserId), index("admin_sessions_exp_idx").on(t.expiresAt)]);

export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  success: boolean("success").notNull(),
  createdAt: createdAt(),
}, (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)]);

/** Limitation de débit générique (ex. création de commandes par IP). */
export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  createdAt: createdAt(),
}, (t) => [index("rate_limits_key_idx").on(t.key, t.createdAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details"),
  ip: text("ip"),
  createdAt: createdAt(),
}, (t) => [index("audit_logs_created_idx").on(t.createdAt)]);

/* ───────────────────────────── Paramètres ───────────────────────────── */

export type SocialLinks = Partial<Record<"facebook" | "instagram" | "tiktok" | "youtube" | "x" | "snapchat" | "linkedin", string>>;

export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  storeName: text("store_name").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  logoKey: text("logo_key"),
  faviconKey: text("favicon_key"),
  phone: text("phone").notNull().default(""),
  /** Numéro WhatsApp du gestionnaire, chiffres uniquement au format international (ex. 2250700000000). */
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  country: text("country").notNull().default(""),
  currency: text("currency").notNull().default("XOF"),
  timezone: text("timezone").notNull().default("Africa/Abidjan"),
  locale: text("locale").notNull().default("fr-FR"),
  socialLinks: jsonb("social_links").$type<SocialLinks>().notNull().default({}),
  /** Frais de livraison par défaut si la commune n'a pas de tarif spécifique (null = à confirmer). */
  defaultDeliveryFee: integer("default_delivery_fee"),
  /** Frais d'expédition par défaut si la ville n'a pas de tarif spécifique (null = à confirmer). */
  defaultShippingFee: integer("default_shipping_fee"),
  deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
  shippingEnabled: boolean("shipping_enabled").notNull().default(true),
  /** Le propriétaire active la prise de commande (impossible sans numéro WhatsApp). */
  ordersEnabled: boolean("orders_enabled").notNull().default(false),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
  /** Délai (heures) après lequel une commande non traitée déclenche un rappel. */
  pendingReminderHours: integer("pending_reminder_hours").notNull().default(2),
  /** Texte d'information livraison affiché sur la fiche produit (facultatif). */
  deliveryInfo: text("delivery_info").notNull().default(""),
  shippingInfo: text("shipping_info").notNull().default(""),
  updatedAt: updatedAt(),
}, (t) => [check("store_settings_singleton", sql`${t.id} = 1`)]);

export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** delivery = commune desservie en livraison locale ; shipping = ville de destination d'expédition. */
  type: text("type", { enum: ["delivery", "shipping"] }).notNull(),
  name: text("name").notNull(),
  /** null = frais à confirmer sur WhatsApp. */
  fee: integer("fee"),
  isActive: boolean("is_active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("shipping_zones_type_name_uq").on(t.type, sql`lower(${t.name})`),
  check("shipping_zones_fee_pos", sql`${t.fee} IS NULL OR ${t.fee} >= 0`),
]);

/* ───────────────────────────── Catalogue ───────────────────────────── */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  imageKey: text("image_key"),
  position: integer("position").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("categories_slug_uq").on(t.slug), index("categories_position_idx").on(t.position)]);

export type ProductSpec = { label: string; value: string };

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  reference: text("reference"),
  description: text("description").notNull().default(""),
  /** Prix d'achat unitaire (coût fournisseur) pour le calcul des bénéfices. */
  purchasePrice: integer("purchase_price").notNull().default(0),
  price: integer("price").notNull(),
  promoPrice: integer("promo_price"),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  /** Stock du produit (utilisé quand le produit n'a pas de variantes actives). */
  stock: integer("stock").notNull().default(0),
  trackStock: boolean("track_stock").notNull().default(true),
  specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("products_slug_uq").on(t.slug),
  uniqueIndex("products_reference_uq").on(t.reference).where(sql`${t.reference} IS NOT NULL`),
  index("products_category_idx").on(t.categoryId),
  index("products_status_idx").on(t.status, t.publishedAt),
  check("products_price_pos", sql`${t.price} >= 0`),
  check("products_promo_valid", sql`${t.promoPrice} IS NULL OR (${t.promoPrice} >= 0 AND ${t.promoPrice} < ${t.price})`),
  check("products_stock_pos", sql`${t.stock} >= 0`),
]);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  /** Clé de stockage de base ; les variantes sont <key>-400.webp, -800.webp, -1600.webp */
  storageKey: text("storage_key").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  alt: text("alt").notNull().default(""),
  position: integer("position").notNull().default(0),
  isMain: boolean("is_main").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [
  index("product_images_product_idx").on(t.productId, t.position),
  uniqueIndex("product_images_main_uq").on(t.productId).where(sql`${t.isMain}`),
]);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  /** Libellé affiché, ex. « Taille M — Noir » */
  name: text("name").notNull(),
  sku: text("sku"),
  /** Prix spécifique à la variante (null = prix du produit). */
  price: integer("price"),
  stock: integer("stock").notNull().default(0),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("product_variants_product_idx").on(t.productId, t.position),
  check("product_variants_stock_pos", sql`${t.stock} >= 0`),
  check("product_variants_price_pos", sql`${t.price} IS NULL OR ${t.price} >= 0`),
]);

/** Produits associés configurés par le propriétaire. */
export const productRelations = pgTable("product_relations", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relatedProductId: uuid("related_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.productId, t.relatedProductId] })]);

/* ───────────────────────────── Clients & commandes ───────────────────────────── */

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Téléphone normalisé (chiffres, avec indicatif si fourni) — identifiant du client. */
  phone: text("phone").notNull(),
  city: text("city").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("customers_phone_uq").on(t.phone)]);

export const deliveryAddresses = pgTable("delivery_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  mode: text("mode", { enum: ["delivery", "shipping"] }).notNull(),
  commune: text("commune"),
  district: text("district"),
  city: text("city"),
  details: text("details"),
  createdAt: createdAt(),
}, (t) => [index("delivery_addresses_customer_idx").on(t.customerId)]);

export const ORDER_STATUSES = [
  "new",
  "pending_confirmation",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull(),
  /** Empreinte du jeton d'accès à la page de confirmation (seul le client le possède). */
  accessTokenHash: text("access_token_hash").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  deliveryAddressId: uuid("delivery_address_id").references(() => deliveryAddresses.id, { onDelete: "set null" }),
  mode: text("mode", { enum: ["delivery", "shipping"] }).notNull(),
  // Instantané des coordonnées au moment de la commande
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  commune: text("commune"),
  district: text("district"),
  city: text("city"),
  addressDetails: text("address_details"),
  subtotal: integer("subtotal").notNull(),
  /** null = frais à confirmer sur WhatsApp. */
  fee: integer("fee"),
  total: integer("total").notNull(),
  currency: text("currency").notNull(),
  status: text("status", { enum: ORDER_STATUSES }).notNull().default("new"),
  paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES }).notNull().default("pending"),
  /** Le stock est-il actuellement réservé par cette commande ? */
  stockReserved: boolean("stock_reserved").notNull().default(false),
  whatsappMessage: text("whatsapp_message").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  adminNotes: text("admin_notes").notNull().default(""),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  ip: text("ip"),
  // Suivi marketing et attribution publicitaire (TikTok, Facebook, Instagram, Google, etc.)
  source: text("source").notNull().default("direct"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  referrer: text("referrer"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("orders_number_uq").on(t.number),
  uniqueIndex("orders_idempotency_uq").on(t.idempotencyKey),
  index("orders_created_idx").on(t.createdAt),
  index("orders_status_idx").on(t.status, t.createdAt),
  index("orders_source_idx").on(t.source, t.createdAt),
  index("orders_customer_idx").on(t.customerId),
  check("orders_amounts_pos", sql`${t.subtotal} >= 0 AND ${t.total} >= 0 AND (${t.fee} IS NULL OR ${t.fee} >= 0)`),
]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  productReference: text("product_reference"),
  variantName: text("variant_name"),
  imageKey: text("image_key"),
  /** Instantané du prix d'achat unitaire au moment de la vente pour le calcul du bénéfice réalisé. */
  unitCost: integer("unit_cost").notNull().default(0),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: integer("line_total").notNull(),
  createdAt: createdAt(),
}, (t) => [
  index("order_items_order_idx").on(t.orderId),
  index("order_items_product_idx").on(t.productId),
  check("order_items_qty_pos", sql`${t.quantity} > 0`),
]);

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  /** status = statut de commande ; payment = statut de paiement ; note = note interne */
  kind: text("kind", { enum: ["status", "payment", "note"] }).notNull().default("status"),
  fromValue: text("from_value"),
  toValue: text("to_value").notNull(),
  note: text("note"),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [index("order_status_history_order_idx").on(t.orderId, t.createdAt)]);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  /** Instantané du libellé pour l'historique. */
  label: text("label").notNull(),
  delta: integer("delta").notNull(),
  stockAfter: integer("stock_after").notNull(),
  reason: text("reason", { enum: ["initial", "manual", "arrival", "order_reserved", "order_cancelled", "order_restored"] }).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  note: text("note"),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [index("stock_movements_product_idx").on(t.productId, t.createdAt), index("stock_movements_created_idx").on(t.createdAt)]);

/* ───────────────────────────── Arrivages & Rentabilité ───────────────────────────── */

export const stockArrivals = pgTable("stock_arrivals", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Titre ou référence de l'arrivage (ex. Arrivage Chine #1). */
  reference: text("reference").notNull(),
  /** Date effective de l'arrivage. */
  arrivalDate: timestamp("arrival_date", { withTimezone: true }).notNull().defaultNow(),
  supplier: text("supplier").notNull().default(""),
  notes: text("notes").notNull().default(""),
  /** Coût d'achat total de toutes les marchandises de l'arrivage. */
  totalCost: integer("total_cost").notNull().default(0),
  /** Chiffre d'affaires total attendu (quantité × prix de vente). */
  expectedRevenue: integer("expected_revenue").notNull().default(0),
  /** Bénéfice total attendu (expectedRevenue - totalCost). */
  expectedProfit: integer("expected_profit").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("stock_arrivals_date_idx").on(t.arrivalDate)]);

export const stockArrivalItems = pgTable("stock_arrival_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  arrivalId: uuid("arrival_id").notNull().references(() => stockArrivals.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  /** Nom de la marchandise. */
  productName: text("product_name").notNull(),
  /** Quantité reçue dans cet arrivage. */
  quantity: integer("quantity").notNull(),
  /** Quantité vendue issue de cet arrivage (pour le suivi du bénéfice réalisé par arrivage). */
  soldQuantity: integer("sold_quantity").notNull().default(0),
  /** Prix d'achat unitaire. */
  purchasePrice: integer("purchase_price").notNull(),
  /** Prix de vente unitaire. */
  sellingPrice: integer("selling_price").notNull(),
  /** Coût d'achat total de la ligne (quantity * purchasePrice). */
  totalCost: integer("total_cost").notNull(),
  /** Chiffre d'affaires attendu de la ligne (quantity * sellingPrice). */
  expectedRevenue: integer("expected_revenue").notNull(),
  /** Bénéfice attendu de la ligne ((sellingPrice - purchasePrice) * quantity). */
  expectedProfit: integer("expected_profit").notNull(),
  createdAt: createdAt(),
}, (t) => [
  index("stock_arrival_items_arrival_idx").on(t.arrivalId),
  index("stock_arrival_items_product_idx").on(t.productId),
]);

/* ───────────────────────────── Thème & pages ───────────────────────────── */

export const themes = pgTable("themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  /** Réglages globaux en brouillon (couleurs, typographie, en-tête, fiche produit…). */
  draftSettings: jsonb("draft_settings").notNull(),
  draftUpdatedAt: timestamp("draft_updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedVersionId: uuid("published_version_id"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("themes_active_uq").on(t.isActive).where(sql`${t.isActive}`)]);

/** Sections de la page d'accueil en BROUILLON. La version publiée est figée dans theme_versions. */
export const themeSections = pgTable("theme_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  themeId: uuid("theme_id").notNull().references(() => themes.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  position: integer("position").notNull().default(0),
  isEnabled: boolean("is_enabled").notNull().default(true),
  settings: jsonb("settings").notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("theme_sections_theme_idx").on(t.themeId, t.position)]);

export const themeVersions = pgTable("theme_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  themeId: uuid("theme_id").notNull().references(() => themes.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  /** Instantané complet : { settings, sections } */
  snapshot: jsonb("snapshot").notNull(),
  note: text("note").notNull().default(""),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("theme_versions_theme_version_uq").on(t.themeId, t.version)]);

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(false),
  isSystem: boolean("is_system").notNull().default(false),
  showInFooter: boolean("show_in_footer").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("pages_slug_uq").on(t.slug)]);

/* ───────────────────────────── Notifications ───────────────────────────── */

export const NOTIFICATION_TYPES = ["new_order", "order_cancelled", "low_stock", "out_of_stock", "order_pending", "status_changed", "test"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  isRead: boolean("is_read").notNull().default(false),
  pushStatus: text("push_status", { enum: ["pending", "sent", "partial", "failed", "no_subscription", "disabled"] }).notNull().default("pending"),
  createdAt: createdAt(),
}, (t) => [index("notifications_created_idx").on(t.createdAt), index("notifications_unread_idx").on(t.isRead)]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceLabel: text("device_label").notNull().default(""),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
  failureCount: integer("failure_count").notNull().default(0),
  lastError: text("last_error"),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("push_subscriptions_endpoint_uq").on(t.endpoint)]);

export const pushDeliveries = pgTable("push_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  notificationId: uuid("notification_id").references(() => notifications.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => pushSubscriptions.id, { onDelete: "set null" }),
  success: boolean("success").notNull(),
  statusCode: integer("status_code"),
  error: text("error"),
  createdAt: createdAt(),
}, (t) => [index("push_deliveries_created_idx").on(t.createdAt)]);

