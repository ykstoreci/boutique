import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { storeSettings, products, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    const db = await getDb();

    const [settings] = await db
      .select({
        ordersEnabled: storeSettings.ordersEnabled,
        deliveryEnabled: storeSettings.deliveryEnabled,
        shippingEnabled: storeSettings.shippingEnabled,
        currency: storeSettings.currency,
      })
      .from(storeSettings)
      .where(eq(storeSettings.id, 1))
      .limit(1);

    let productData = null;

    if (productId) {
      const [prod] = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          promoPrice: products.promoPrice,
          stock: products.stock,
          trackStock: products.trackStock,
          status: products.status,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (prod) {
        const variants = await db
          .select({
            id: productVariants.id,
            name: productVariants.name,
            price: productVariants.price,
            stock: productVariants.stock,
          })
          .from(productVariants)
          .where(eq(productVariants.productId, productId));

        productData = {
          ...prod,
          isPublished: prod.status === "published",
          variants,
        };
      }
    }

    return NextResponse.json(
      {
        success: true,
        serverTime: Date.now(),
        ordersEnabled: settings?.ordersEnabled ?? true,
        deliveryEnabled: settings?.deliveryEnabled ?? true,
        shippingEnabled: settings?.shippingEnabled ?? true,
        currency: settings?.currency ?? "XOF",
        product: productData,
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
    console.error("Erreur sync store :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
