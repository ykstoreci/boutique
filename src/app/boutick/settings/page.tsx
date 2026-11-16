import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCachedStoreSettings } from "@/lib/cache";
import { AdminSettingsView } from "@/components/admin/AdminSettingsView";

export default async function AdminSettingsPage() {
  const admin = await getCurrentAdmin();
  

  const settings = await getCachedStoreSettings();

  return <AdminSettingsView settings={settings} admin={admin.user} />;
}

