import { getCurrentAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getDb } from "@/db";
import { orders, orderItems, orderStatusHistory, storeSettings } from "@/db/schema";
import { AdminOrderDetailView } from "@/components/admin/AdminOrderDetailView";
import { eq, desc } from "drizzle-orm";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdmin();
  

  const { id } = await params;
  const db = await getDb();
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) {
    notFound();
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id))
    .orderBy(desc(orderStatusHistory.createdAt));

  return (
    <AdminOrderDetailView
      order={order}
      items={items}
      history={history}
      currency={order.currency}
      locale={settings?.locale || "fr-FR"}
    />
  );
}

