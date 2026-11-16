import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { pages } from "@/db/schema";
import { cachedQuery } from "@/lib/cache";
import { AdminPagesView } from "@/components/admin/AdminPagesView";
import { asc } from "drizzle-orm";

export default async function AdminPagesListPage() {
  const admin = await getCurrentAdmin();
  

  const allPages = await cachedQuery("admin:pages:list", 30_000, async () => {
    const db = await getDb();
    return db.select().from(pages).orderBy(asc(pages.slug));
  });

  return <AdminPagesView pages={allPages} />;
}

