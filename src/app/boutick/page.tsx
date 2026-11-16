import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { cachedQuery, getCachedStoreSettings } from "@/lib/cache";
import {
  orders,
  orderItems,
  products,
  stockArrivals,
  stockArrivalItems,
} from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { getSourceDisplay } from "@/lib/tracking";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const admin = await getCurrentAdmin();
  

  const { period = "30d" } = await searchParams;
  const now = new Date();
  let startDate = new Date(0); // 'all'

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === "12m") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [settings, dashData] = await Promise.all([
    getCachedStoreSettings(),
    cachedQuery(`admin:dashboard:${period}`, 30_000, async () => {
      const db = await getDb();
      const [
        allProducts,
        todayOrders,
        periodOrders,
        topProducts,
        allArrivals,
        allArrivalItems,
        periodOrderItemsRows,
      ] = await Promise.all([
        db.select().from(products),
        db.select().from(orders).where(gte(orders.createdAt, todayStart)),
        db.select().from(orders).where(gte(orders.createdAt, startDate)).orderBy(desc(orders.createdAt)),
        db
          .select({
            productId: orderItems.productId,
            productName: orderItems.productName,
            totalQuantity: sql<number>`sum(${orderItems.quantity})`,
            totalAmount: sql<number>`sum(${orderItems.lineTotal})`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(and(gte(orders.createdAt, startDate), sql`${orders.status} != 'cancelled'`))
          .groupBy(orderItems.productId, orderItems.productName)
          .orderBy(desc(sql`sum(${orderItems.quantity})`))
          .limit(5),
        db.select().from(stockArrivals).orderBy(desc(stockArrivals.arrivalDate)),
        db.select().from(stockArrivalItems),
        db
          .select({
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            unitCost: orderItems.unitCost,
            unitPrice: orderItems.unitPrice,
            lineTotal: orderItems.lineTotal,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(and(gte(orders.createdAt, startDate), sql`${orders.status} != 'cancelled'`)),
      ]);
      return {
        allProducts,
        todayOrders,
        periodOrders,
        topProducts,
        allArrivals,
        allArrivalItems,
        periodOrderItemsRows,
      };
    }),
  ]);

  const {
    allProducts,
    todayOrders,
    periodOrders,
    topProducts,
    allArrivals,
    allArrivalItems,
    periodOrderItemsRows,
  } = dashData;

  const currency = settings?.currency || "XOF";
  const locale = settings?.locale || "fr-FR";
  const lowStockThreshold = settings?.lowStockThreshold || 3;

  // Dictionnaire des prix d'achat par produit pour fallback
  const productCostMap: Record<string, number> = {};
  for (const p of allProducts) {
    productCostMap[p.id] = p.purchasePrice || 0;
  }

  // Arrivages filtrés sur la période sélectionnée
  const periodArrivals = allArrivals.filter((a) => new Date(a.arrivalDate) >= startDate);
  const periodArrivalIds = new Set(periodArrivals.map((a) => a.id));
  const periodArrivalItems = allArrivalItems.filter((it) => periodArrivalIds.has(it.arrivalId));

  // Bénéfice attendu sur la période (arrivages de la période, ou total des arrivages/stock si aucun arrivage sur la sous-période)
  const arrivalsExpectedProfitPeriod = periodArrivals.reduce((s, a) => s + (a.expectedProfit || 0), 0);
  const arrivalsTotalCostPeriod = periodArrivals.reduce((s, a) => s + (a.totalCost || 0), 0);
  const arrivalsExpectedRevenuePeriod = periodArrivals.reduce((s, a) => s + (a.expectedRevenue || 0), 0);

  // Potentiel de bénéfice sur le stock catalogue actuel
  const catalogStockExpectedProfit = allProducts.reduce((sum, p) => {
    const sellPrice = p.promoPrice && p.promoPrice < p.price ? p.promoPrice : p.price;
    const buyPrice = p.purchasePrice || 0;
    return sum + Math.max(0, p.stock) * Math.max(0, sellPrice - buyPrice);
  }, 0);

  const expectedProfitDisplay =
    periodArrivals.length > 0 ? arrivalsExpectedProfitPeriod : catalogStockExpectedProfit;

  // Bénéfice réalisé sur la période :
  // 1) Via les commandes valides de la période
  const realizedProfitFromOrders = periodOrderItemsRows.reduce((sum, item) => {
    const costPerUnit =
      item.unitCost && item.unitCost > 0
        ? item.unitCost
        : item.productId
        ? productCostMap[item.productId] || 0
        : 0;
    return sum + (item.lineTotal - costPerUnit * item.quantity);
  }, 0);

  // 2) Via les marchandises pointées comme vendues dans les arrivages de la période
  const realizedProfitFromArrivals = periodArrivalItems.reduce(
    (sum, it) => sum + (it.soldQuantity || 0) * ((it.sellingPrice || 0) - (it.purchasePrice || 0)),
    0
  );

  // Prendre le maximum cohérent (ou la somme si les arrivages sont gérés hors commandes en ligne)
  const realizedProfitPeriod = Math.max(realizedProfitFromOrders, realizedProfitFromArrivals);

  // 1. Indicateurs de stock produits (Indépendants de la période de filtre)
  const totalProducts = allProducts.length;
  const inStockProducts = allProducts.filter((p) => !p.trackStock || p.stock > lowStockThreshold).length;
  const lowStockProducts = allProducts.filter((p) => p.trackStock && p.stock > 0 && p.stock <= lowStockThreshold).length;
  const outOfStockProducts = allProducts.filter((p) => p.trackStock && p.stock <= 0).length;

  const newOrders = periodOrders.filter((o) => o.status === "new");
  const pendingOrders = periodOrders.filter((o) => o.status === "pending_confirmation");
  const confirmedOrders = periodOrders.filter((o) => o.status === "confirmed" || o.status === "preparing");
  const deliveredOrders = periodOrders.filter((o) => o.status === "delivered" || o.status === "completed");

  // Chiffre d'affaires réel calculé à partir des commandes non annulées
  const validOrders = periodOrders.filter((o) => o.status !== "cancelled");
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);

  // 4. Répartition Livraison vs Expédition
  const deliveryOrdersCount = validOrders.filter((o) => o.mode === "delivery").length;
  const shippingOrdersCount = validOrders.filter((o) => o.mode === "shipping").length;
  const totalModes = deliveryOrdersCount + shippingOrdersCount;
  const deliveryPercent = totalModes > 0 ? Math.round((deliveryOrdersCount / totalModes) * 100) : 0;
  const shippingPercent = totalModes > 0 ? 100 - deliveryPercent : 0;

  // 6. Performances des canaux d'acquisition et publicités (TikTok, Facebook, Instagram, Google, Direct, etc.)
  const sourceStatsMap: Record<string, { count: number; revenue: number }> = {};
  for (const o of validOrders) {
    const s = o.source || "direct";
    if (!sourceStatsMap[s]) {
      sourceStatsMap[s] = { count: 0, revenue: 0 };
    }
    sourceStatsMap[s].count += 1;
    sourceStatsMap[s].revenue += o.total;
  }
  const sourceStats = Object.entries(sourceStatsMap)
    .map(([src, stat]) => ({
      source: src,
      count: stat.count,
      revenue: stat.revenue,
      percent: validOrders.length > 0 ? Math.round((stat.count / validOrders.length) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres de date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Tableau de bord</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Données commerciales et indicateurs de performance réels
          </p>
        </div>

        {/* Filtres de période */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs self-start text-xs font-semibold">
          {[
            { key: "today", label: "Aujourd'hui" },
            { key: "7d", label: "7 jours" },
            { key: "30d", label: "30 jours" },
            { key: "12m", label: "12 mois" },
            { key: "all", label: "Tout" },
          ].map((f) => (
            <Link
              key={f.key}
              href={`/boutick?period=${f.key}`}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === f.key
                  ? "bg-black text-white shadow-xs"
                  : "text-gray-600 hover:text-black hover:bg-gray-100"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* GRILLE D'INDICATEURS CLÉS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Chiffre d'affaires */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-gray-500">Chiffre d&apos;affaires</span>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {formatMoney(totalRevenue, currency, locale)}
          </div>
          <span className="text-[11px] text-gray-400 block">
            {validOrders.length} commande{validOrders.length > 1 ? "s" : ""} valide{validOrders.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Bénéfice attendu */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-emerald-800">Bénéfice attendu</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            +{formatMoney(expectedProfitDisplay, currency, locale)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium block">
            {periodArrivals.length > 0
              ? `${periodArrivals.length} arrivage${periodArrivals.length > 1 ? "s" : ""} sur la période`
              : "Sur le stock actuel disponible"}
          </span>
        </div>

        {/* Bénéfice réalisé sur la période */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-blue-800">Bénéfice réalisé</span>
          <div className="text-xl sm:text-2xl font-black text-blue-700">
            +{formatMoney(realizedProfitPeriod, currency, locale)}
          </div>
          <span className="text-[11px] text-blue-600 font-medium block">
            Bénéfice net encaissé sur la période
          </span>
        </div>

        {/* Commandes du jour */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-gray-500">Commandes du jour</span>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {todayOrders.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold block">
            Aujourd&apos;hui
          </span>
        </div>

        {/* Nouvelles commandes à traiter */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-gray-500">Nouvelles commandes</span>
          <div className="text-xl sm:text-2xl font-black text-red-600">
            {newOrders.length}
          </div>
          <span className="text-[11px] text-gray-400 block">
            {pendingOrders.length} en attente
          </span>
        </div>

        {/* Commandes livrées */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-gray-500">Commandes livrées</span>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {deliveredOrders.length}
          </div>
          <span className="text-[11px] text-gray-400 block">
            {confirmedOrders.length} en cours de prép.
          </span>
        </div>
      </div>

      {/* SECTION RENTABILITÉ DES ARRIVAGES & BÉNÉFICES SUR LA PÉRIODE */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm tracking-tight text-gray-900">
              💰 Bénéfices Attendus & Bénéfices Réalisés (Arrivages & Ventes)
            </h2>
            <p className="text-[11px] text-gray-500">
              Synthèse financière des arrivages de marchandises et des ventes sur la période sélectionnée
            </p>
          </div>
          <Link
            href="/boutick/stock"
            prefetch={true}
            className="text-xs font-bold text-black bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl self-start transition-all"
          >
            Gérer les arrivages &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[11px] font-semibold text-gray-500 block">Coût d&apos;achat (Arrivages)</span>
            <span className="text-base font-black text-gray-900">
              {formatMoney(arrivalsTotalCostPeriod, currency, locale)}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[11px] font-semibold text-gray-500 block">Valeur de vente attendue</span>
            <span className="text-base font-black text-gray-900">
              {formatMoney(arrivalsExpectedRevenuePeriod, currency, locale)}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-800 block">Bénéfice attendu</span>
            <span className="text-base font-black text-emerald-700">
              +{formatMoney(expectedProfitDisplay, currency, locale)}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-[11px] font-bold text-blue-800 block">Bénéfice réalisé (période)</span>
            <span className="text-base font-black text-blue-700">
              +{formatMoney(realizedProfitPeriod, currency, locale)}
            </span>
          </div>
        </div>
      </div>

      {/* ÉTAT DES STOCKS & INVENTAIRE */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs text-center">
          <span className="text-xs font-semibold text-gray-500 block">Disponibles</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600">{inStockProducts}</span>
          <span className="text-[10px] text-gray-400 block">produits</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs text-center">
          <span className="text-xs font-semibold text-gray-500 block">Stock faible</span>
          <span className="text-xl sm:text-2xl font-black text-amber-600">{lowStockProducts}</span>
          <span className="text-[10px] text-gray-400 block">&le; {lowStockThreshold} unités</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs text-center">
          <span className="text-xs font-semibold text-gray-500 block">En rupture</span>
          <span className="text-xl sm:text-2xl font-black text-red-600">{outOfStockProducts}</span>
          <span className="text-[10px] text-gray-400 block">0 unité</span>
        </div>
      </div>

      {/* RENTABILITÉ PUBLICITAIRE & ORIGINE DES CLIENTS */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <h2 className="font-bold text-sm tracking-tight text-gray-900">
              Origine des Clients & Performances Publicitaires
            </h2>
            <p className="text-[11px] text-gray-500">
              Chiffre d&apos;affaires et nombre de commandes selon la source (TikTok Ads, Facebook, Instagram, Google, Direct...)
            </p>
          </div>
          <span className="text-[11px] font-semibold text-gray-400">
            {sourceStats.length} canal{sourceStats.length > 1 ? "aux" : ""}
          </span>
        </div>

        {sourceStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {sourceStats.map((st) => {
              const badge = getSourceDisplay(st.source);
              return (
                <div
                  key={st.source}
                  className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}>
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">{st.percent}%</span>
                  </div>

                  <div className="pt-1">
                    <div className="text-lg font-black text-gray-900">
                      {formatMoney(st.revenue, currency, locale)}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">
                      {st.count} commande{st.count > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-400">
            Aucune donnée de commande sur cette période. Les origines de vos futures publicités apparaîtront ici.
          </div>
        )}
      </div>

      {/* GRAPHIQUES ET ANALYSES (SVG Natifs - Données réelles, zéro fictif) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique Répartition Réception : Livraison vs Expédition */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
          <h2 className="font-bold text-sm tracking-tight text-gray-900">
            Répartition Livraison & Expédition
          </h2>

          {totalModes > 0 ? (
            <div className="space-y-4 pt-2">
              <div className="h-6 w-full rounded-full bg-gray-100 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${deliveryPercent}%` }}
                  className="bg-black flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500"
                >
                  {deliveryPercent > 10 ? `${deliveryPercent}%` : ""}
                </div>
                <div
                  style={{ width: `${shippingPercent}%` }}
                  className="bg-amber-500 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500"
                >
                  {shippingPercent > 10 ? `${shippingPercent}%` : ""}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-black flex-shrink-0" />
                  <div>
                    <span className="font-semibold block">Livraison locale</span>
                    <span className="text-gray-500">{deliveryOrdersCount} commande{deliveryOrdersCount > 1 ? "s" : ""} ({deliveryPercent}%)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block">Expédition (Villes)</span>
                    <span className="text-gray-500">{shippingOrdersCount} commande{shippingOrdersCount > 1 ? "s" : ""} ({shippingPercent}%)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">
              Aucune commande sur cette période.
            </div>
          )}
        </div>

        {/* Produits les plus commandés */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
          <h2 className="font-bold text-sm tracking-tight text-gray-900">
            Articles les plus commandés
          </h2>

          {topProducts.length > 0 ? (
            <div className="divide-y divide-gray-100 text-xs">
              {topProducts.map((tp, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-gray-400 font-bold">#{idx + 1}</span>
                    <span className="font-semibold text-gray-900 truncate">{tp.productName}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="font-bold text-gray-900">{tp.totalQuantity} vendu{tp.totalQuantity > 1 ? "s" : ""}</span>
                    <span className="text-gray-400 text-[11px] block">{formatMoney(tp.totalAmount, currency, locale)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">
              Aucun produit commandé pour le moment.
            </div>
          )}
        </div>
      </div>

      {/* DERNIÈRES COMMANDES RÉCENTES */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm tracking-tight text-gray-900">
            Dernières commandes reçues
          </h2>
          <Link href="/boutick/orders" className="text-xs font-semibold text-blue-600 hover:underline">
            Voir toutes les commandes &rarr;
          </Link>
        </div>

        {periodOrders.length > 0 ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 uppercase tracking-wider border-b border-gray-100 font-semibold">
                <tr>
                  <th className="pb-2">N°</th>
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Origine / Pub</th>
                  <th className="pb-2">Réception</th>
                  <th className="pb-2">Montant</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {periodOrders.slice(0, 8).map((o) => {
                  const srcBadge = getSourceDisplay(o.source);
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-mono font-bold text-gray-900">{o.number}</td>
                      <td className="py-3">
                        <span className="font-semibold block text-gray-900">{o.customerName}</span>
                        <span className="text-gray-400 text-[11px]">{o.customerPhone}</span>
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${srcBadge.badgeClass}`}>
                          <span>{srcBadge.icon}</span>
                          <span>{srcBadge.label}</span>
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="capitalize">{o.mode === "delivery" ? "🛵 Livraison" : "📦 Expédition"}</span>
                      </td>
                      <td className="py-3 font-bold text-gray-900">
                        {formatMoney(o.total, currency, locale)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.status === "new"
                              ? "bg-red-100 text-red-700"
                              : o.status === "confirmed"
                              ? "bg-blue-100 text-blue-700"
                              : o.status === "delivered" || o.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {o.status === "new"
                            ? "Nouvelle"
                            : o.status === "pending_confirmation"
                            ? "En attente"
                            : o.status === "confirmed"
                            ? "Confirmée"
                            : o.status === "preparing"
                            ? "En préparation"
                            : o.status === "delivered"
                            ? "Livrée"
                            : o.status === "cancelled"
                            ? "Annulée"
                            : o.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/boutick/orders/${o.id}`}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-black hover:text-white font-semibold transition-all"
                        >
                          Détails
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-gray-400">
            Aucune commande enregistrée pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
