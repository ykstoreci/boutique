import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { customers, orders, storeSettings } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { desc, sql, ilike, eq } from "drizzle-orm";
import Link from "next/link";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const { q } = await searchParams;
  const db = await getDb();
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  const currency = settings?.currency || "XOF";
  const locale = settings?.locale || "fr-FR";

  let condition = undefined;
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    condition = sql`(${customers.name} ILIKE ${term} OR ${customers.phone} ILIKE ${term} OR ${customers.city} ILIKE ${term})`;
  }

  const allCustomers = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      city: customers.city,
      createdAt: customers.createdAt,
      orderCount: sql<number>`(
        SELECT count(*) FROM orders
        WHERE orders.customer_id = ${customers.id}
      )`,
      totalSpent: sql<number>`(
        SELECT coalesce(sum(orders.total), 0) FROM orders
        WHERE orders.customer_id = ${customers.id}
        AND orders.status != 'cancelled'
      )`,
    })
    .from(customers)
    .where(condition)
    .orderBy(desc(customers.updatedAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Répertoire Clients</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {allCustomers.length} client{allCustomers.length > 1 ? "s" : ""} enregistré{allCustomers.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
        <form method="GET" action="/admin/customers" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="Rechercher par nom, téléphone ou ville..."
            className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800"
          >
            Rechercher
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {allCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Téléphone</th>
                  <th className="py-3 px-4">Ville / Commune</th>
                  <th className="py-3 px-4">Commandes</th>
                  <th className="py-3 px-4">Total Dépensé</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-bold text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-gray-700">{c.phone}</td>
                    <td className="py-3 px-4 text-gray-500">{c.city || "—"}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {c.orderCount} commande{c.orderCount > 1 ? "s" : ""}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {formatMoney(c.totalSpent, currency, locale)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(c.phone)}`}
                        className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-black hover:text-white font-semibold transition-all"
                      >
                        Voir ses commandes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-gray-400">
            Aucun client enregistré pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
