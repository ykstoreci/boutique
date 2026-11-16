import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { storeSettings } from "@/db/schema";
import { AdminSettingsView } from "@/components/admin/AdminSettingsView";
import { eq } from "drizzle-orm";

export default async function AdminSettingsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const db = await getDb();
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  return <AdminSettingsView settings={settings} admin={admin.user} />;
}

