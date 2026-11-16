import { getDb } from "@/db";
import { orders, orderItems, storeSettings } from "@/db/schema";
import { hashAccessToken } from "@/lib/order-number";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { OrderConfirmationView } from "@/components/store/OrderConfirmationView";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;
  if (!id) {
    notFound();
  }

  const db = await getDb();
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  // Sécurité : Vérifier le jeton d'accès pour empêcher un inconnu d'accéder aux données privées
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    notFound();
  }

  // Si un jeton est fourni, vérifier son hachage
  if (token) {
    const tokenHash = hashAccessToken(token);
    if (tokenHash !== order.accessTokenHash) {
      notFound();
    }
  }

  // Récupérer les articles
  const items = await db
    .select({
      productName: orderItems.productName,
      variantName: orderItems.variantName,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const whatsappUrl = buildWhatsappUrl(order.whatsappNumber, order.whatsappMessage);

  return (
    <OrderConfirmationView
      order={{
        ...order,
        whatsappUrl,
      }}
      items={items}
      currency={order.currency}
      locale={settings?.locale || "fr-FR"}
    />
  );
}

