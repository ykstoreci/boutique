"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";

export function AdminShippingView({
  zones: initialZones,
  settings,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zones: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
}) {
  const [zones, setZones] = useState(initialZones);
  const [deliveryEnabled, setDeliveryEnabled] = useState(settings?.deliveryEnabled !== false);
  const [shippingEnabled, setShippingEnabled] = useState(settings?.shippingEnabled !== false);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(
    settings?.defaultDeliveryFee !== null && settings?.defaultDeliveryFee !== undefined
      ? String(settings.defaultDeliveryFee)
      : ""
  );
  const [defaultShippingFee, setDefaultShippingFee] = useState(
    settings?.defaultShippingFee !== null && settings?.defaultShippingFee !== undefined
      ? String(settings.defaultShippingFee)
      : ""
  );
  const [deliveryInfo, setDeliveryInfo] = useState(settings?.deliveryInfo || "");

  const [newType, setNewType] = useState<"delivery" | "shipping">("delivery");
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingZone, setAddingZone] = useState(false);

  const currency = settings?.currency || "XOF";
  const locale = settings?.locale || "fr-FR";

  const deliveryZones = zones.filter((z) => z.type === "delivery");
  const shippingZones = zones.filter((z) => z.type === "shipping");

  async function handleSaveGlobalSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryEnabled,
          shippingEnabled,
          defaultDeliveryFee: defaultDeliveryFee ? parseInt(defaultDeliveryFee, 10) : null,
          defaultShippingFee: defaultShippingFee ? parseInt(defaultShippingFee, 10) : null,
          deliveryInfo: deliveryInfo.trim(),
        }),
      });

      if (res.ok) {
        alert("Paramètres de livraison enregistrés !");
      } else {
        alert("Erreur d'enregistrement.");
      }
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAddZone(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setAddingZone(true);
    try {
      const feeVal = newFee ? parseInt(newFee, 10) : null;
      const res = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          name: newName.trim(),
          fee: feeVal,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setZones((prev) => [...prev, data.zone]);
        setNewName("");
        setNewFee("");
      } else {
        alert(data.error || "Erreur lors de l'ajout.");
      }
    } finally {
      setAddingZone(false);
    }
  }

  async function handleDeleteZone(id: string) {
    if (!confirm("Voulez-vous supprimer cette zone ?")) return;

    const res = await fetch(`/api/admin/shipping?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setZones((prev) => prev.filter((z) => z.id !== id));
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Livraison & Expédition</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configurez les communes locales, les villes d&apos;expédition et les tarifs
        </p>
      </div>

      {/* Paramètres généraux & frais par défaut */}
      <form onSubmit={handleSaveGlobalSettings} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">Options globales</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">🛵 Livraison locale</span>
              <input
                type="checkbox"
                checked={deliveryEnabled}
                onChange={(e) => setDeliveryEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-black focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">
                Frais par défaut si commune non listée ({currency}) :
              </label>
              <input
                type="number"
                min="0"
                placeholder="Vide = À convenir sur WhatsApp"
                value={defaultDeliveryFee}
                onChange={(e) => setDefaultDeliveryFee(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">📦 Expédition (Villes)</span>
              <input
                type="checkbox"
                checked={shippingEnabled}
                onChange={(e) => setShippingEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-black focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">
                Frais par défaut si ville non listée ({currency}) :
              </label>
              <input
                type="number"
                min="0"
                placeholder="Vide = Modalités sur WhatsApp"
                value={defaultShippingFee}
                onChange={(e) => setDefaultShippingFee(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">
            Note informative affichée sur la fiche produit (facultatif)
          </label>
          <textarea
            rows={2}
            value={deliveryInfo}
            onChange={(e) => setDeliveryInfo(e.target.value)}
            placeholder="Ex : Livraison sous 24h à Abidjan. Expéditions vers l'intérieur du pays par compagnie de transport..."
            className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <button
          type="submit"
          disabled={savingSettings}
          className="px-4 py-2 rounded-xl bg-black text-white font-bold text-xs hover:bg-gray-800 transition-all disabled:opacity-50"
        >
          {savingSettings ? "Enregistrement..." : "Enregistrer les options globales"}
        </button>
      </form>

      {/* Formulaire d'ajout rapide d'une zone ou ville */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 text-xs">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">+ Ajouter une commune ou ville</h2>

        <form onSubmit={handleAddZone} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as "delivery" | "shipping")}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold bg-white"
            >
              <option value="delivery">🛵 Commune (Livraison)</option>
              <option value="shipping">📦 Ville (Expédition)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <input
              type="text"
              required
              placeholder={newType === "delivery" ? "Ex : Cocody, Plateau, Marcory..." : "Ex : Bouaké, Yamoussoukro, Korhogo..."}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder={`Frais ${currency} (vide = sur WhatsApp)`}
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={addingZone}
              className="px-4 py-2 rounded-xl bg-black text-white font-bold text-xs hover:bg-gray-800 flex-shrink-0"
            >
              {addingZone ? "..." : "Ajouter"}
            </button>
          </div>
        </form>
      </div>

      {/* Grilles des zones configurées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Communes livraison locale */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900">🛵 Communes locales ({deliveryZones.length})</h3>
          </div>
          {deliveryZones.length > 0 ? (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {deliveryZones.map((z) => (
                <div key={z.id} className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{z.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700">
                      {z.fee !== null ? formatMoney(z.fee, currency, locale) : "Sur WhatsApp"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteZone(z.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 py-6 text-center">Aucune commune spécifique configurée.</p>
          )}
        </div>

        {/* Villes d'expédition */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900">📦 Villes d&apos;expédition ({shippingZones.length})</h3>
          </div>
          {shippingZones.length > 0 ? (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {shippingZones.map((z) => (
                <div key={z.id} className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{z.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700">
                      {z.fee !== null ? formatMoney(z.fee, currency, locale) : "Modalités sur WhatsApp"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteZone(z.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 py-6 text-center">Aucune ville spécifique configurée.</p>
          )}
        </div>
      </div>
    </div>
  );
}

