import { getCurrentAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getDb } from "@/db";
import { products, productImages, productVariants, categories, storeSettings } from "@/db/schema";
import { AdminProductForm } from "@/components/admin/AdminProductForm";
import { ProductCampaignLinkBuilder } from "@/components/admin/ProductCampaignLinkBuilder";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdmin();
  

  const { id } = await params;
  const db = await getDb();

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) notFound();

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(sql`${productImages.isMain} DESC`, productImages.position);

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id))
    .orderBy(productVariants.position);

  const allCategories = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(categories.position);
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  return (
    <div className="space-y-6">
      <AdminProductForm
        initialData={{
          ...product,
          images,
          variants,
        }}
        categories={allCategories}
        currency={settings?.currency || "XOF"}
      />

      <ProductCampaignLinkBuilder
        productSlug={product.slug}
        productName={product.name}
      />
    </div>
  );
}

