"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { getImageUrl } from "@/lib/images";
import { getSourceDisplay } from "@/lib/tracking";

export function AdminOrderDetailView({
  order,
  items,
  history,
  currency,
  locale,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  history: any[];
  currency: string;
  locale: string;
}) {
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(order.paymentStatus);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const STATUS_OPTIONS = [
    { value: "new", label: "Nouvelle commande" },
    { value: "pending_confirmation", label: "En attente de confirmation" },
    { value: "confirmed", label: "Confirmée" },
    { value: "preparing", label: "En préparation" },
    { value: "out_for_delivery", label: "En cours de livraison" },
    { value: "shipped", label: "Expédiée" },
    { value: "delivered", label: "Livrée" },
    { value: "completed", label: "Terminée" },
    { value: "cancelled", label: "Annulée (restitue le stock)" },
  ];

  const PAYMENT_OPTIONS = [
    { value: "pending", label: "En attente de paiement" },
    { value: "paid", label: "Payé" },
    { value: "refunded", label: "Remboursé" },
  ];

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: currentStatus,
          paymentStatus: currentPaymentStatus,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback("Mise à jour enregistrée !");
        setNote("");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setFeedback(data.error || "Erreur de mise à jour.");
      }
    } catch {
      setFeedback("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  // URL WhatsApp pour contacter le client directement
  const clientWhatsappUrl = `https://wa.me/${order.customerPhone.replace(/\D/g, "")}`;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/orders" className="text-xs text-gray-500 hover:underline">
              &larr; Retour aux commandes
            </Link>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Commande {order.number}
          </h1>
          <p className="text-xs text-gray-500">
            Reçue le {new Date(order.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={clientWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold shadow-xs hover:bg-[#20bd5a] flex items-center gap-1.5 transition-all"
          >
            <span>💬 Contacter sur WhatsApp</span>
          </a>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche (2/3) : Articles, Coordonnées & Historique */}
        <div className="lg:col-span-2 space-y-6">
          {/* Articles commandés */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
            <h2 className="font-bold text-sm tracking-tight">Articles commandés</h2>
            <div className="divide-y divide-gray-100">
              {items.map((it) => {
                const img = getImageUrl(it.imageKey, "thumbnail");
                return (
                  <div key={it.id} className="py-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={it.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          Sans photo
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-xs text-gray-900 block truncate">{it.productName}</span>
                      {it.variantName && (
                        <span className="text-[11px] text-gray-500 block">Modèle : {it.variantName}</span>
                      )}
                      <span className="text-[11px] text-gray-400">
                        {it.quantity} &times; {formatMoney(it.unitPrice, currency, locale)}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-gray-900 flex-shrink-0">
                      {formatMoney(it.lineTotal, currency, locale)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Récapitulatif montants */}
            <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Sous-total :</span>
                <span className="font-semibold text-gray-900">{formatMoney(order.subtotal, currency, locale)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{order.mode === "delivery" ? "Frais de livraison :" : "Frais d'expédition :"}</span>
                <span className="font-semibold text-gray-900">
                  {order.fee === null ? (
                    <span className="text-amber-600">À convenir sur WhatsApp</span>
                  ) : order.fee === 0 ? (
                    <span className="text-emerald-600 font-bold">OFFERTS</span>
                  ) : (
                    formatMoney(order.fee, currency, locale)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-dashed border-gray-200 text-gray-900">
                <span>Montant Total :</span>
                <span>{formatMoney(order.total, currency, locale)}</span>
              </div>
            </div>
          </div>

          {/* Coordonnées de livraison */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 text-xs">
            <h2 className="font-bold text-sm tracking-tight">Coordonnées de Réception</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 block text-[11px]">Nom complet</span>
                <span className="font-semibold text-gray-900">{order.customerName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Téléphone</span>
                <span className="font-semibold text-gray-900 font-mono">{order.customerPhone}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Mode</span>
                <span className="font-semibold text-gray-900">
                  {order.mode === "delivery" ? "🛵 Livraison locale" : "📦 Expédition"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Destination</span>
                <span className="font-semibold text-gray-900">
                  {order.mode === "delivery"
                    ? `${order.commune || ""}, ${order.district || ""}`
                    : order.city || ""}
                </span>
              </div>
            </div>
            {order.addressDetails && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-400 block text-[11px]">Précisions complémentaires</span>
                <p className="text-gray-700 mt-0.5">{order.addressDetails}</p>
              </div>
            )}
          </div>

          {/* Origine du client & Campagne Publicitaire */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm tracking-tight text-gray-900">
                Origine & Suivi Publicitaire
              </h2>
              {(() => {
                const badge = getSourceDisplay(order.source);
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.badgeClass}`}>
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </span>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-gray-400 block text-[11px]">Canal d&apos;acquisition</span>
                <span className="font-bold text-gray-900 uppercase tracking-wide">
                  {order.source || "Direct"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">Campagne publicitaire (UTM)</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {order.utmCampaign || "—"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">Support / Format (Medium)</span>
                <span className="font-semibold text-gray-900">
                  {order.utmMedium || (order.source !== "direct" ? "Publicité / Lien" : "—")}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">Source UTM</span>
                <span className="font-semibold text-gray-900">
                  {order.utmSource || "—"}
                </span>
              </div>
            </div>

            {order.referrer && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-400 block text-[11px]">URL Référente</span>
                <span className="text-gray-600 truncate block text-[11px] font-mono mt-0.5">
                  {order.referrer}
                </span>
              </div>
            )}
          </div>

          {/* Historique des statuts */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 text-xs">
            <h2 className="font-bold text-sm tracking-tight">Historique de la commande</h2>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">
                        {h.kind === "status" ? `Statut : ${h.toValue}` : h.kind === "payment" ? `Paiement : ${h.toValue}` : "Note"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(h.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {h.note && <p className="text-gray-600 text-[11px] mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite (1/3) : Actions & Mises à jour */}
        <div className="space-y-6">
          <form onSubmit={handleUpdate} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
            <h2 className="font-bold text-sm tracking-tight">Mettre à jour</h2>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Statut de la commande
              </label>
              <select
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Statut du paiement
              </label>
              <select
                value={currentPaymentStatus}
                onChange={(e) => setCurrentPaymentStatus(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Ajouter une note ou justification
              </label>
              <textarea
                rows={3}
                placeholder="Ex : Client contacté, livraison prévue demain 14h..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-black text-white font-bold text-xs hover:bg-gray-800 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </form>

          {/* Message WhatsApp enregistré */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2 text-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
              Message WhatsApp généré
            </h3>
            <pre className="p-3 rounded-xl bg-gray-50 text-[11px] font-mono whitespace-pre-wrap text-gray-700 border border-gray-200 max-h-60 overflow-y-auto">
              {order.whatsappMessage}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
