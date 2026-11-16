import { getCurrentAdmin } from "@/lib/auth";
import { getCachedAdminBadgeCounts } from "@/lib/cache";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminPwaManager } from "@/components/admin/AdminPwaManager";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  let unreadNotificationsCount = 0;
  let newOrdersCount = 0;

  if (admin) {
    try {
      const counts = await getCachedAdminBadgeCounts();
      unreadNotificationsCount = counts.unreadNotificationsCount;
      newOrdersCount = counts.newOrdersCount;
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col text-gray-900">
      <AdminNavigation
        adminName={admin?.user.name}
        unreadNotifications={unreadNotificationsCount}
        newOrdersCount={newOrdersCount}
        isProduction={process.env.NODE_ENV === "production"}
      />
      <div className={`${admin ? "md:pl-64" : ""} flex-1 pb-20 md:pb-8 flex flex-col`}>
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1">
          {admin && <AdminPwaManager />}
          {children}
        </div>
      </div>
    </div>
  );
}
