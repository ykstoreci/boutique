import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { shippingZones, storeSettings } from "@/db/schema";
import { AdminShippingView } from "@/components/admin/AdminShippingView";
import { eq } from "drizzle-orm";

export default async function AdminShippingPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const db = await getDb();
  const allZones = await db.select().from(shippingZones).orderBy(shippingZones.position);
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  return <AdminShippingView zones={allZones} settings={settings} />;
}

