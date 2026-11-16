import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { cachedQuery } from "@/lib/cache";
import { AdminCategoriesView } from "@/components/admin/AdminCategoriesView";
import { sql } from "drizzle-orm";

export default async function AdminCategoriesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const allCategories = await cachedQuery("admin:categories:list", 30_000, async () => {
    const db = await getDb();
    return db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageKey: categories.imageKey,
        isPublished: categories.isPublished,
        position: categories.position,
        productCount: sql<number>`(
          SELECT count(*) FROM products
          WHERE products.category_id = ${categories.id}
        )`,
      })
      .from(categories)
      .orderBy(categories.position);
  });

  return <AdminCategoriesView categories={allCategories} />;
}

