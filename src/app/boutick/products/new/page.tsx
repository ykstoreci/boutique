import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { categories, storeSettings } from "@/db/schema";
import { AdminProductForm } from "@/components/admin/AdminProductForm";
import { eq } from "drizzle-orm";

export default async function NewProductPage() {
  const admin = await getCurrentAdmin();
  

  const db = await getDb();
  const allCategories = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(categories.position);
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  return (
    <AdminProductForm
      categories={allCategories}
      currency={settings?.currency || "XOF"}
    />
  );
}

