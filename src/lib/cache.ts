/**
 * Cache mémoire ultra-rapide (sub-milliseconde < 1ms) pour éliminer les requêtes
 * répétitives entre RootLayout, StoreLayout, AdminLayout et les pages.
 * Invalidé instantanément dès qu'une modification est effectuée dans l'administration.
 */
import { getDb } from "@/db";
import { storeSettings, categories, pages, notifications, orders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const globalForCache = globalThis as unknown as {
  __boutiqueFastCache?: Map<string, CacheEntry<unknown>>;
};

function getCacheMap(): Map<string, CacheEntry<unknown>> {
  if (!globalForCache.__boutiqueFastCache) {
    globalForCache.__boutiqueFastCache = new Map();
  }
  return globalForCache.__boutiqueFastCache;
}

export async function cachedQuery<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const map = getCacheMap();
  const now = Date.now();
  const hit = map.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await fetcher();
  map.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateCache(prefix?: string): void {
  const map = getCacheMap();
  if (!prefix) {
    map.clear();
    return;
  }
  for (const k of map.keys()) {
    if (k.startsWith(prefix)) {
      map.delete(k);
    }
  }
}

export async function getCachedStoreSettings() {
  return cachedQuery("store:settings", 30_000, async () => {
    const db = await getDb();
    const [s] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
    return s || null;
  });
}

export async function getCachedPublishedCategories() {
  return cachedQuery("store:categories", 30_000, async () => {
    const db = await getDb();
    return db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        imageKey: categories.imageKey,
      })
      .from(categories)
      .where(eq(categories.isPublished, true))
      .orderBy(categories.position);
  });
}

export async function getCachedFooterPages() {
  return cachedQuery("store:footerPages", 30_000, async () => {
    const db = await getDb();
    return db
      .select({ slug: pages.slug, title: pages.title })
      .from(pages)
      .where(eq(pages.showInFooter, true))
      .orderBy(pages.createdAt);
  });
}

export async function getCachedAdminBadgeCounts() {
  return cachedQuery("admin:badges", 5_000, async () => {
    const db = await getDb();
    const [unreadRes, newOrdersRes] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(eq(notifications.isRead, false)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(eq(orders.status, "new")),
    ]);
    return {
      unreadNotificationsCount: unreadRes[0]?.count ?? 0,
      newOrdersCount: newOrdersRes[0]?.count ?? 0,
    };
  });
}
