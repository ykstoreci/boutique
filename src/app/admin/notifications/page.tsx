import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { AdminNotificationsView } from "@/components/admin/AdminNotificationsView";
import { desc } from "drizzle-orm";

export default async function AdminNotificationsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const db = await getDb();
  const allNotifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);

  return <AdminNotificationsView notifications={allNotifs} />;
}

