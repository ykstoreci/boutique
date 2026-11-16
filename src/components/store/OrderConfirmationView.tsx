"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

export function OrderConfirmationView({
  order,
  items,
  currency,
  locale,
}: {
  order: {
    id: string;
    number: string;
    mode: "delivery" | "shipping";
    customerName: string;
    customerPhone: string;
    commune?: string | null;
    district?: string | null;
    city?: string | null;
    addressDetails?: string | null;
    subtotal: number;
    fee: number | null;
    total: number;
    whatsappUrl: string;
    whatsappMessage: string;
    createdAt: Date;
  };
  items: {
    productName: string;
    variantName?: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  currency: string;
  locale: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(order.whatsappMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function handleOpenWhatsapp() {
    window.open(order.whatsappUrl, "_blank");
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">
      {/* En-tête succès */}
      <div className="text-center mb-8">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs ${
            order.mode === "shipping"
              ? "bg-[#25D366]/15 text-[#20bd5a]"
              : "bg-emerald-100 text-emerald-600"
          }`}
        >
          {order.mode === "shipping" ? (
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {order.mode === "shipping" ? "Expédition enregistrée !" : "Commande validée avec succès !"}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--theme-muted)] mt-2">
          Numéro de commande :{" "}
          <span className="font-mono font-bold text-[var(--theme-text)] bg-black/5 px-2 py-0.5 rounded">
            {order.number}
          </span>
        </p>

        {/* Message explicatif selon le mode */}
        <div className="mt-4 p-3.5 rounded-xl text-xs sm:text-sm leading-relaxed border text-left">
          {order.mode === "delivery" ? (
            <div className="bg-emerald-50 border-emerald-200 text-emerald-900 flex items-start gap-3">
              <span className="text-lg">🚚</span>
              <div>
                <strong className="block font-semibold">Paiement à la livraison</strong>
                Notre livreur vous contactera par téléphone au{" "}
                <span className="font-bold underline">{order.customerPhone}</span> pour convenir de l&apos;heure
                et du lieu précis de livraison. Vous paierez en espèces à la réception de votre colis.
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border-amber-200 text-amber-900 flex items-start gap-3">
              <span className="text-lg">💬</span>
              <div>
                <strong className="block font-semibold">Modalités d&apos;expédition sur WhatsApp</strong>
                Votre commande vers{" "}
                <span className="font-bold underline">{order.city || "votre destination"}</span> est bien enregistrée.
                Veuillez finaliser les modalités de transport (gare, compagnie) et de paiement avec notre gestionnaire.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carte Récapitulative */}
      <div className="rounded-[var(--theme-radius-card)] bg-[var(--theme-surface)] border border-[var(--theme-border)] p-5 sm:p-6 mb-6 space-y-4 shadow-xs">
        <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--theme-muted)]">
          Détails des articles
        </h2>

        <div className="divide-y divide-[var(--theme-border)]">
          {items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex justify-between items-center text-sm">
              <div>
                <span className="font-semibold block">{item.productName}</span>
                {item.variantName && (
                  <span className="text-xs text-[var(--theme-muted)] block">Modèle : {item.variantName}</span>
                )}
                <span className="text-xs text-[var(--theme-muted)]">
                  Qté : {item.quantity} &times; {formatMoney(item.unitPrice, currency, locale)}
                </span>
              </div>
              <span className="font-bold">{formatMoney(item.lineTotal, currency, locale)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[var(--theme-border)] space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--theme-muted)]">Sous-total :</span>
            <span className="font-semibold">{formatMoney(order.subtotal, currency, locale)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-[var(--theme-muted)]">
              {order.mode === "delivery" ? "Livraison locale :" : "Expédition :"}
            </span>
            <span className="font-semibold">
              {order.fee === null ? (
                <span className="text-amber-600 font-medium">À confirmer sur WhatsApp</span>
              ) : order.fee === 0 ? (
                <span className="text-emerald-600 font-bold">OFFERTS</span>
              ) : (
                formatMoney(order.fee, currency, locale)
              )}
            </span>
          </div>

          <div className="flex justify-between text-base font-black pt-2 border-t border-dashed border-[var(--theme-border)]">
            <span>Total :</span>
            <span className="text-[var(--theme-price)]">{formatMoney(order.total, currency, locale)}</span>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="pt-3 border-t border-[var(--theme-border)] text-xs space-y-1 text-[var(--theme-muted)]">
          <div><strong className="text-[var(--theme-text)]">Client :</strong> {order.customerName} ({order.customerPhone})</div>
          <div>
            <strong className="text-[var(--theme-text)]">Destination :</strong>{" "}
            {order.mode === "delivery"
              ? `${order.commune || ""}, ${order.district || ""}`
              : order.city || ""}
          </div>
          {order.addressDetails && (
            <div><strong className="text-[var(--theme-text)]">Précisions :</strong> {order.addressDetails}</div>
          )}
        </div>
      </div>

      {/* ACTIONS SELON LE MODE DE RÉCEPTION */}
      {order.mode === "shipping" ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleOpenWhatsapp}
            className="w-full py-3.5 px-4 rounded-[var(--theme-radius-btn)] font-bold text-sm tracking-wide uppercase shadow-md flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white active:scale-98 transition-all"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>Ouvrir WhatsApp pour confirmer</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 px-4 rounded-[var(--theme-radius-btn)] font-semibold text-xs border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-black/5 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Message copié dans le presse-papier !</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copier le récapitulatif pour l&apos;envoyer manuellement</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <Link
            href="/catalogue"
            className="w-full py-3.5 px-4 rounded-[var(--theme-radius-btn)] font-bold text-sm tracking-wide uppercase shadow-md flex items-center justify-center gap-2 bg-[var(--theme-primary)] hover:opacity-95 text-[var(--theme-primary-text)] active:scale-98 transition-all"
          >
            <span>Continuer mes achats</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <div className="text-center text-xs text-[var(--theme-muted)] pt-1">
            Un SMS ou un appel vous sera passé avant l&apos;arrivée du livreur.
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/catalogue"
          className="text-xs font-semibold text-[var(--theme-primary)] hover:underline"
        >
          &larr; Retourner au catalogue
        </Link>
      </div>
    </div>
  );
}

