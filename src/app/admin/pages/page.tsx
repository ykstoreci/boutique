import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { pages } from "@/db/schema";
import { AdminPagesView } from "@/components/admin/AdminPagesView";
import { asc } from "drizzle-orm";

export default async function AdminPagesListPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const db = await getDb();
  const allPages = await db.select().from(pages).orderBy(asc(pages.slug));

  return <AdminPagesView pages={allPages} />;
}

