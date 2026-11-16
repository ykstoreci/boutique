import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { orders, notifications } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { cachedQuery } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
  }

  try {
    const summary = await cachedQuery("sync:admin:summary", 4000, async () => {
      const db = await getDb();

      const [latestOrders, latestNotifs, [newOrdersCountRes], [unreadNotifsCountRes]] = await Promise.all([
        db
          .select({
            id: orders.id,
            number: orders.number,
            customerName: orders.customerName,
            customerPhone: orders.customerPhone,
            total: orders.total,
            currency: orders.currency,
            mode: orders.mode,
            commune: orders.commune,
            district: orders.district,
            city: orders.city,
            status: orders.status,
            createdAt: orders.createdAt,
            source: orders.source,
          })
          .from(orders)
          .orderBy(desc(orders.createdAt))
          .limit(1),

        db
          .select({
            id: notifications.id,
            type: notifications.type,
            title: notifications.title,
            body: notifications.body,
            url: notifications.url,
            isRead: notifications.isRead,
            createdAt: notifications.createdAt,
          })
          .from(notifications)
          .orderBy(desc(notifications.createdAt))
          .limit(1),

        db
          .select({ count: sql<number>`count(*)::int` })
          .from(orders)
          .where(eq(orders.status, "new")),

        db
          .select({ count: sql<number>`count(*)::int` })
          .from(notifications)
          .where(eq(notifications.isRead, false)),
      ]);

      return {
        latestOrder: latestOrders[0] || null,
        latestNotification: latestNotifs[0] || null,
        newOrdersCount: newOrdersCountRes?.count ?? 0,
        unreadNotificationsCount: unreadNotifsCountRes?.count ?? 0,
      };
    });

    return NextResponse.json(
      {
        success: true,
        serverTime: Date.now(),
        ...summary,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("Erreur sync admin :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
