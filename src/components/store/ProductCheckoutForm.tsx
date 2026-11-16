"use client";

import { useState, useId, useEffect } from "react";
import { formatMoney, effectivePrice } from "@/lib/money";
import { getImageUrl } from "@/lib/images";
import { getStoredAttribution } from "@/lib/tracking";

export type VariantOption = {
  id: string;
  name: string;
  price: number | null;
  stock: number;
};

export type ZoneInfo = {
  name: string;
  fee: number | null;
};

export function ProductCheckoutForm({
  product,
  variants,
  mainImageKey,
  deliveryZones,
  shippingZones,
  defaultDeliveryFee,
  defaultShippingFee,
  deliveryEnabled,
  shippingEnabled,
  ordersEnabled,
  currency,
  locale,
}: {
  product: {
    id: string;
    name: string;
    price: number;
    promoPrice: number | null;
    stock: number;
    trackStock: boolean;
  };
  variants: VariantOption[];
  mainImageKey: string | null;
  deliveryZones: ZoneInfo[];
  shippingZones: ZoneInfo[];
  defaultDeliveryFee: number | null;
  defaultShippingFee: number | null;
  deliveryEnabled: boolean;
  shippingEnabled: boolean;
  ordersEnabled: boolean;
  currency: string;
  locale: string;
}) {
  const formSessionId = useId();
  // Clé d'idempotence unique par session de commande
  const [idempotencyKey] = useState(() => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  // État temps réel synchronisé avec l'administration
  const [liveStock, setLiveStock] = useState<number>(product.stock);
  const [livePrice, setLivePrice] = useState<number>(product.price);
  const [livePromoPrice, setLivePromoPrice] = useState<number | null>(product.promoPrice);
  const [liveVariants, setLiveVariants] = useState<VariantOption[]>(variants);
  const [liveOrdersEnabled, setLiveOrdersEnabled] = useState<boolean>(ordersEnabled);

  // Synchronisation en temps réel (Polling léger 6s + BroadcastChannel 0ms)
  useEffect(() => {
    let active = true;

    async function syncProductState() {
      try {
        const res = await fetch(`/api/sync/store?productId=${product.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.success) {
          setLiveOrdersEnabled(data.ordersEnabled);
          if (data.product) {
            setLiveStock(data.product.stock);
            setLivePrice(data.product.price);
            setLivePromoPrice(data.product.promoPrice);
            if (data.product.variants && data.product.variants.length > 0) {
              setLiveVariants(data.product.variants);
            }
          }
        }
      } catch {}
    }

    const interval = setInterval(syncProductState, 6000);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("boutique_realtime");
        channel.onmessage = (event) => {
          if (event.data?.type === "stock_updated" || event.data?.type === "store_updated") {
            syncProductState();
          }
        };
      }
    } catch {}

    return () => {
      active = false;
      clearInterval(interval);
      if (channel) channel.close();
    };
  }, [product.id]);

  // Mode de réception : Livraison ou Expédition
  const initialMode = deliveryEnabled ? "delivery" : shippingEnabled ? "shipping" : "delivery";
  const [mode, setMode] = useState<"delivery" | "shipping">(initialMode);

  // Variante sélectionnée
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    liveVariants.length > 0 ? liveVariants[0].id : ""
  );

  // Quantité
  const [quantity, setQuantity] = useState<number>(1);

  // Coordonnées du client
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [commune, setCommune] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [addressDetails, setAddressDetails] = useState("");

  // État de soumission
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calcul du prix unitaire selon variante ou produit
  const selectedVariant = liveVariants.find((v) => v.id === selectedVariantId) || null;
  const unitPrice = selectedVariant?.price !== null && selectedVariant?.price !== undefined
    ? selectedVariant.price
    : effectivePrice(livePrice, livePromoPrice);

  const subtotal = unitPrice * quantity;

  // Calcul dynamique des frais de livraison ou expédition
  let fee: number | null = null;
  if (mode === "delivery") {
    const matched = deliveryZones.find(
      (z) => z.name.trim().toLowerCase() === commune.trim().toLowerCase()
    );
    if (matched && matched.fee !== null) {
      fee = matched.fee;
    } else if (defaultDeliveryFee !== null && defaultDeliveryFee !== undefined) {
      fee = defaultDeliveryFee;
    }
  } else {
    const matched = shippingZones.find(
      (z) => z.name.trim().toLowerCase() === city.trim().toLowerCase()
    );
    if (matched && matched.fee !== null) {
      fee = matched.fee;
    } else if (defaultShippingFee !== null && defaultShippingFee !== undefined) {
      fee = defaultShippingFee;
    }
  }

  const total = subtotal + (fee ?? 0);

  // Vérification de stock disponible en temps réel
  const currentStock = selectedVariant ? selectedVariant.stock : liveStock;
  const isOutOfStock = product.trackStock && currentStock <= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!liveOrdersEnabled) {
      setErrorMessage("La boutique n'accepte pas de commande actuellement.");
      return;
    }

    if (isOutOfStock) {
      setErrorMessage("Cet article est en rupture de stock.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Veuillez saisir votre nom complet.");
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage("Veuillez saisir votre numéro de téléphone.");
      return;
    }

    if (mode === "delivery") {
      if (!commune.trim()) {
        setErrorMessage("Veuillez indiquer votre commune de livraison.");
        return;
      }
      if (!district.trim()) {
        setErrorMessage("Veuillez indiquer votre quartier ou repère de livraison.");
        return;
      }
    } else {
      if (!city.trim()) {
        setErrorMessage("Veuillez indiquer la ville de destination.");
        return;
      }
    }

    setLoading(true);

    try {
      const attribution = getStoredAttribution();
      const payload = {
        mode,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        commune: mode === "delivery" ? commune.trim() : undefined,
        district: mode === "delivery" ? district.trim() : undefined,
        city: mode === "shipping" ? city.trim() : undefined,
        addressDetails: addressDetails.trim() || undefined,
        idempotencyKey,
        source: attribution?.source || "direct",
        utmSource: attribution?.utmSource || undefined,
        utmMedium: attribution?.utmMedium || undefined,
        utmCampaign: attribution?.utmCampaign || undefined,
        referrer: attribution?.referrer || (typeof document !== "undefined" ? document.referrer : undefined),
        items: [
          {
            productId: product.id,
            variantId: selectedVariantId || undefined,
            quantity,
          },
        ],
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Impossible d'enregistrer votre commande. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      // Diffuser immédiatement aux onglets administrateur ouverts (0ms de latence)
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const ch = new BroadcastChannel("boutique_realtime");
          ch.postMessage({
            type: "new_order",
            order: {
              id: data.orderId,
              number: data.orderNumber,
              customerName: customerName.trim(),
              customerPhone: customerPhone.trim(),
              total,
              currency,
              mode: data.mode,
              commune: mode === "delivery" ? commune : null,
              district: mode === "delivery" ? district : null,
              city: mode === "shipping" ? city : null,
              createdAt: new Date().toISOString(),
            },
          });
          ch.close();
        }
      } catch {}

      // SUCCÈS : La commande est enregistrée dans la base de données.
      // Pour l'expédition : ouvrir WhatsApp automatiquement pour convenir des modalités
      // Pour la livraison locale : pas de WhatsApp, commande enregistrée en admin uniquement
      if (data.mode === "shipping" && data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      }

      // Rediriger le client vers la page de confirmation de commande
      window.location.href = `/orders/confirmation?id=${data.orderId}&token=${data.accessToken}`;
    } catch {
      setErrorMessage("Une erreur de connexion est survenue. Veuillez vérifier votre réseau.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 p-4 sm:p-6 rounded-[var(--theme-radius-card)] bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xs">
      {/* 6. VARIANTES (si le produit en possède) */}
      {variants.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)] mb-2">
            Modèle / Variante :
          </label>
          <div className="grid grid-cols-2 gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariantId(v.id)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold text-left border transition-all ${
                  selectedVariantId === v.id
                    ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-text)] shadow-xs"
                    : "border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-text)] hover:opacity-80"
                }`}
              >
                <div className="truncate">{v.name}</div>
                {v.price && (
                  <div className="text-[11px] opacity-80">{formatMoney(v.price, currency, locale)}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 7. SÉLECTION DE QUANTITÉ */}
      <div className="mb-6 flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
          Quantité :
        </label>
        <div className="flex items-center border border-[var(--theme-border)] rounded-lg overflow-hidden bg-[var(--theme-background)]">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center font-bold text-base hover:bg-black/5 active:scale-95"
            disabled={quantity <= 1 || loading}
          >
            -
          </button>
          <span className="w-10 text-center font-bold text-sm select-none">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(product.trackStock ? currentStock : 99, q + 1))}
            className="w-9 h-9 flex items-center justify-center font-bold text-base hover:bg-black/5 active:scale-95"
            disabled={(product.trackStock && quantity >= currentStock) || loading}
          >
            +
          </button>
        </div>
      </div>

      {/* CHOIX DU MODE : LIVRAISON OU EXPÉDITION */}
      <div className="mb-5">
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)] mb-2">
          Mode de réception :
        </label>
        <div className="grid grid-cols-2 gap-2">
          {deliveryEnabled && (
            <button
              type="button"
              onClick={() => setMode("delivery")}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                mode === "delivery"
                  ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-text)] shadow-xs"
                  : "border-[var(--theme-border)] bg-[var(--theme-background)] hover:opacity-80"
              }`}
            >
              <span>🛵 Livraison locale</span>
            </button>
          )}

          {shippingEnabled && (
            <button
              type="button"
              onClick={() => setMode("shipping")}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                mode === "shipping"
                  ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-text)] shadow-xs"
                  : "border-[var(--theme-border)] bg-[var(--theme-background)] hover:opacity-80"
              }`}
            >
              <span>📦 Expédition (Villes)</span>
            </button>
          )}
        </div>
      </div>

      {/* 8. FORMULAIRE DE COMMANDE DIRECT EN UNE SEULE PAGE */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--theme-text)]">
            Nom et prénom(s) *
          </label>
          <input
            type="text"
            required
            placeholder="Ex : Kouamé Jean"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={loading}
            className="w-full text-sm px-3.5 py-2.5 rounded-[var(--theme-radius-input)] border border-[var(--theme-border)] bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--theme-text)]">
            Numéro de téléphone (appel & WhatsApp) *
          </label>
          <input
            type="tel"
            required
            placeholder="Ex : 0700000000"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            disabled={loading}
            className="w-full text-sm px-3.5 py-2.5 rounded-[var(--theme-radius-input)] border border-[var(--theme-border)] bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
        </div>

        {/* CHAMPS DYNAMIQUES DU MODE 1 : LIVRAISON */}
        {mode === "delivery" && (
          <>
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--theme-text)]">
                Commune de livraison *
              </label>
              {deliveryZones.length > 0 ? (
                <select
                  required
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  disabled={loading}
                  className="w-full text-sm px-3.5 py-2.5 rounded-[var(--theme-radius-input)] border border-[var(--theme-border)] bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                >
                  <option value="">Sélectionnez votre commune...</option>
                  {deliveryZones.map((z, idx) => (
                    <option key={idx} value={z.name}>
                      {z.name} {z.fee !== null ? `(${formatMoney(z.fee, currency, locale)})` : "(Frais à confirmer)"}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Ex : Cocody, Marcory, Yopougon..."
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  disabled={loading}
                  className="w-full text-sm px-3.5 py-2.5 rounded-[var(--theme-radius-input)] border border-[var(--theme-border)] bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--theme-text)]">
                Quartier ou lieu de livraison *
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Angré 8ème tranche, carrefour prière..."
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={loading}
                className="w-full text-sm px-3.5 py-2.5 rounded-[var(--theme-radius-input)] border border-[var(--theme-border)] bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
            </div>
          </>
        )}

        {/* CHAMPS DYNAMIQUES DU MODE 2 : EXPÉDITION */}
        {mode === "shipping" && (
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--theme-text)]">
              Ville de destination *
            </label>
            {shippingZones.length > 0 ? (
              <select
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                className="w-full text-sm px-3.5 py-2.5 rounded-[var(--theme-radius-input)] border border-[var(--theme-border)] bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              >
                <option value="">Sélectionnez votre ville...</option>
                {shippingZones.map((z, idx) => (
                  <option key={idx} value={z.name}>
                    {z.name} {z.fee !== null ? `(${formatMoney(z.fee, currency, locale)})` : "(Modalités sur WhatsApp)"}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder="Ex : Bouaké, Yamoussoukro, San-Pedro..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                className="w-full text-sm px-3.5 py-2.5 rounded-[var(--theme-radius-input)] border border-[var(--theme-border)] bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--theme-text)]">
            Précisions sur l&apos;adresse (facultatif)
          </label>
          <textarea
            rows={2}
            placeholder="Numéro de porte, bâtiment, indications particulières..."
            value={addressDetails}
            onChange={(e) => setAddressDetails(e.target.value)}
            disabled={loading}
            className="w-full text-sm px-3.5 py-2 rounded-[var(--theme-radius-input)] border border-[var(--theme-border)] bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
        </div>

        {/* RÉCAPITULATIF DE COMMANDE AVANT VALIDATION */}
        <div className="pt-3 pb-1 border-t border-[var(--theme-border)] space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--theme-muted)]">Sous-total ({quantity} article{quantity > 1 ? "s" : ""}) :</span>
            <span className="font-semibold">{formatMoney(subtotal, currency, locale)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-[var(--theme-muted)]">
              {mode === "delivery" ? "Frais de livraison :" : "Frais d'expédition :"}
            </span>
            <span className="font-semibold">
              {fee === null ? (
                <span className="text-amber-600 font-medium">À confirmer sur WhatsApp</span>
              ) : fee === 0 ? (
                <span className="text-emerald-600 font-bold">OFFERTS</span>
              ) : (
                formatMoney(fee, currency, locale)
              )}
            </span>
          </div>

          <div className="flex justify-between text-sm pt-2 border-t border-dashed border-[var(--theme-border)] font-bold">
            <span>{fee === null ? "Total provisoire :" : "Montant total :"}</span>
            <span className="text-base text-[var(--theme-price)]">
              {formatMoney(total, currency, locale)}
            </span>
          </div>

          <div className="text-[11px] text-[var(--theme-muted)] pt-1 italic">
            {mode === "delivery"
              ? "💳 Paiement à la réception de votre commande."
              : "💬 Modalités de paiement et d'expédition discutées avec le gestionnaire sur WhatsApp."}
          </div>
        </div>

        {/* Message d'erreur */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* 9. BOUTON DE VALIDATION OBLIGATOIRE */}
        <button
          type="submit"
          disabled={loading || isOutOfStock || !liveOrdersEnabled}
          className="w-full py-3.5 px-4 rounded-[var(--theme-radius-btn)] font-bold text-sm tracking-wide uppercase transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 bg-[var(--theme-primary)] hover:opacity-95 text-[var(--theme-primary-text)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Enregistrement de la commande...</span>
            </>
          ) : isOutOfStock ? (
            <span>Article en rupture de stock</span>
          ) : !liveOrdersEnabled ? (
            <span>Commandes temporairement fermées</span>
          ) : (
            <span>VALIDER</span>
          )}
        </button>
      </form>
    </div>
  );
}
