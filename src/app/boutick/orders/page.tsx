import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { getCachedStoreSettings, cachedQuery } from "@/lib/cache";
import { formatMoney } from "@/lib/money";
import { getSourceDisplay } from "@/lib/tracking";
import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import Link from "next/link";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mode?: string; source?: string; q?: string }>;
}) {
  const admin = await getCurrentAdmin();
  

  const { status, mode, source, q } = await searchParams;
  const settings = await getCachedStoreSettings();

  const currency = settings?.currency || "XOF";
  const locale = settings?.locale || "fr-FR";

  const conditions: SQL[] = [];

  if (status && status !== "all") {
    // @ts-expect-error valid status
    conditions.push(eq(orders.status, status));
  }

  if (mode && (mode === "delivery" || mode === "shipping")) {
    conditions.push(eq(orders.mode, mode));
  }

  if (source && source !== "all") {
    conditions.push(eq(orders.source, source.toLowerCase()));
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      sql`(${orders.number} ILIKE ${term} OR ${orders.customerName} ILIKE ${term} OR ${orders.customerPhone} ILIKE ${term})`
    );
  }

  const cacheKey = `admin:orders:${status || ""}:${mode || ""}:${source || ""}:${q || ""}`;
  const allOrders = await cachedQuery(cacheKey, 10_000, async () => {
    const db = await getDb();
    return db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt));
  });

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    new: { label: "Nouvelle", color: "bg-red-100 text-red-700" },
    pending_confirmation: { label: "En attente", color: "bg-amber-100 text-amber-700" },
    confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-700" },
    preparing: { label: "En préparation", color: "bg-indigo-100 text-indigo-700" },
    out_for_delivery: { label: "En livraison", color: "bg-purple-100 text-purple-700" },
    shipped: { label: "Expédiée", color: "bg-cyan-100 text-cyan-700" },
    delivered: { label: "Livrée", color: "bg-emerald-100 text-emerald-700" },
    completed: { label: "Terminée", color: "bg-emerald-100 text-emerald-800" },
    cancelled: { label: "Annulée", color: "bg-gray-100 text-gray-500" },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Gestion des Commandes</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {allOrders.length} commande{allOrders.length > 1 ? "s" : ""} trouvée{allOrders.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Barre de recherche et filtres de commande */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
        <form method="GET" action="/boutick/orders" className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          {/* Recherche */}
          <div className="sm:col-span-2">
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Rechercher par N°, nom du client ou téléphone..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Filtre Statut */}
          <div>
            <select
              name="status"
              defaultValue={status || "all"}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouvelles</option>
              <option value="pending_confirmation">En attente de confirmation</option>
              <option value="confirmed">Confirmées</option>
              <option value="preparing">En préparation</option>
              <option value="out_for_delivery">En livraison</option>
              <option value="shipped">Expédiées</option>
              <option value="delivered">Livrées</option>
              <option value="completed">Terminées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>

          {/* Filtre Mode */}
          <div>
            <select
              name="mode"
              defaultValue={mode || "all"}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="all">Tous les modes</option>
              <option value="delivery">Livraison locale</option>
              <option value="shipping">Expédition</option>
            </select>
          </div>

          {/* Filtre Origine / Publicité */}
          <div>
            <select
              name="source"
              defaultValue={source || "all"}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="all">Toutes origines</option>
              <option value="tiktok">🎵 TikTok</option>
              <option value="facebook">📘 Facebook</option>
              <option value="instagram">📸 Instagram</option>
              <option value="google">🔍 Google</option>
              <option value="snapchat">👻 Snapchat</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="direct">🌐 Accès direct</option>
            </select>
          </div>

          <div className="sm:col-span-5 flex justify-end gap-2">
            <Link
              href="/boutick/orders"
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50"
            >
              Réinitialiser
            </Link>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-gray-800"
            >
              Filtrer
            </button>
          </div>
        </form>
      </div>

      {/* Tableau des commandes */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {allOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">N° Commande</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Réception</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4">Origine / Pub</th>
                  <th className="py-3 px-4">Statut Commande</th>
                  <th className="py-3 px-4">Paiement</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allOrders.map((o) => {
                  const st = STATUS_LABELS[o.status] || { label: o.status, color: "bg-gray-100 text-gray-700" };
                  const srcBadge = getSourceDisplay(o.source);
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {o.number}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold block text-gray-900">{o.customerName}</span>
                        <span className="text-gray-400 font-mono text-[11px]">{o.customerPhone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium block">
                          {o.mode === "delivery" ? "🛵 Livraison" : "📦 Expédition"}
                        </span>
                        <span className="text-gray-400 text-[11px] block truncate max-w-[140px]">
                          {o.mode === "delivery" ? `${o.commune || ""}` : `${o.city || ""}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {formatMoney(o.total, currency, locale)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${srcBadge.badgeClass}`}>
                          <span>{srcBadge.icon}</span>
                          <span>{srcBadge.label}</span>
                        </span>
                        {o.utmCampaign && (
                          <span className="block text-[10px] text-gray-400 font-mono truncate max-w-[100px] mt-0.5">
                            {o.utmCampaign}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.paymentStatus === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : o.paymentStatus === "refunded"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {o.paymentStatus === "paid"
                            ? "Payé"
                            : o.paymentStatus === "refunded"
                            ? "Remboursé"
                            : "En attente"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/boutick/orders/${o.id}`}
                          className="px-3 py-1.5 rounded-lg bg-black text-white font-semibold text-xs hover:bg-gray-800 transition-all inline-block"
                        >
                          Gérer
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-gray-400">
            Aucune commande ne correspond à ces critères.
          </div>
        )}
      </div>
    </div>
  );
}

