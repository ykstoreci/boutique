import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { shippingZones } from "@/db/schema";
import { getCachedStoreSettings, cachedQuery } from "@/lib/cache";
import { AdminShippingView } from "@/components/admin/AdminShippingView";

export default async function AdminShippingPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const [settings, allZones] = await Promise.all([
    getCachedStoreSettings(),
    cachedQuery("admin:shipping:zones", 30_000, async () => {
      const db = await getDb();
      return db.select().from(shippingZones).orderBy(shippingZones.position);
    }),
  ]);

  return <AdminShippingView zones={allZones} settings={settings} />;
}

