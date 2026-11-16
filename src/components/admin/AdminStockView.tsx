"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

interface ArrivalItem {
  id: string;
  arrivalId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  soldQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  totalCost: number;
  expectedRevenue: number;
  expectedProfit: number;
}

interface Arrival {
  id: string;
  reference: string;
  arrivalDate: string | Date;
  supplier: string;
  notes: string;
  totalCost: number;
  expectedRevenue: number;
  expectedProfit: number;
  items: ArrivalItem[];
}

interface DraftArrivalItem {
  key: string;
  productId: string;
  productName: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
}

export function AdminStockView({
  products,
  movements,
  arrivals = [],
  lowStockThreshold = 3,
  currency = "XOF",
  locale = "fr-FR",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movements: any[];
  arrivals?: Arrival[];
  lowStockThreshold: number;
  currency?: string;
  locale?: string;
}) {
  const [activeTab, setActiveTab] = useState<"arrivals" | "inventory">("arrivals");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  // État pour l'ajustement rapide d'un produit du catalogue
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState<string>("");
  const [newPurchasePriceValue, setNewPurchasePriceValue] = useState<string>("");
  const [newSellingPriceValue, setNewSellingPriceValue] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // État pour la création d'un nouvel arrivage
  const [showNewArrivalForm, setShowNewArrivalForm] = useState(arrivals.length === 0);
  const [reference, setReference] = useState("");
  const [arrivalDate, setArrivalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [syncCatalog, setSyncCatalog] = useState(true);
  const [draftItems, setDraftItems] = useState<DraftArrivalItem[]>([
    {
      key: "item-1",
      productId: "",
      productName: "",
      quantity: "1",
      purchasePrice: "",
      sellingPrice: "",
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtre inventaire
  const filteredProducts = products.filter((p) => {
    if (!p.trackStock) return filter === "all";
    if (filter === "out") return p.stock <= 0;
    if (filter === "low") return p.stock > 0 && p.stock <= lowStockThreshold;
    return true;
  });

  // Calculs globaux sur tous les arrivages
  const globalArrivalsStats = arrivals.reduce(
    (acc, arr) => {
      acc.totalCost += arr.totalCost || 0;
      acc.expectedRevenue += arr.expectedRevenue || 0;
      acc.expectedProfit += arr.expectedProfit || 0;
      for (const it of arr.items || []) {
        acc.totalUnits += it.quantity || 0;
        acc.soldUnits += it.soldQuantity || 0;
        const unitProfit = (it.sellingPrice || 0) - (it.purchasePrice || 0);
        acc.realizedProfit += (it.soldQuantity || 0) * unitProfit;
        acc.realizedRevenue += (it.soldQuantity || 0) * (it.sellingPrice || 0);
      }
      return acc;
    },
    {
      totalCost: 0,
      expectedRevenue: 0,
      expectedProfit: 0,
      realizedProfit: 0,
      realizedRevenue: 0,
      totalUnits: 0,
      soldUnits: 0,
    }
  );

  // Calculs en direct du formulaire de nouvel arrivage
  const draftSummary = draftItems.reduce(
    (acc, it) => {
      const q = Math.max(0, parseInt(it.quantity || "0", 10) || 0);
      const pa = Math.max(0, parseInt(it.purchasePrice || "0", 10) || 0);
      const pv = Math.max(0, parseInt(it.sellingPrice || "0", 10) || 0);
      const cost = q * pa;
      const rev = q * pv;
      const prof = rev - cost;
      acc.totalUnits += q;
      acc.totalCost += cost;
      acc.expectedRevenue += rev;
      acc.expectedProfit += prof;
      return acc;
    },
    { totalUnits: 0, totalCost: 0, expectedRevenue: 0, expectedProfit: 0 }
  );

  function addDraftItemRow() {
    setDraftItems((prev) => [
      ...prev,
      {
        key: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: "",
        productName: "",
        quantity: "1",
        purchasePrice: "",
        sellingPrice: "",
      },
    ]);
  }

  function removeDraftItemRow(key: string) {
    if (draftItems.length <= 1) return;
    setDraftItems((prev) => prev.filter((r) => r.key !== key));
  }

  function updateDraftItem(key: string, field: keyof DraftArrivalItem, value: string) {
    setDraftItems((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        if (field === "productId") {
          const found = products.find((p) => p.id === value);
          if (found) {
            return {
              ...row,
              productId: value,
              productName: found.name,
              purchasePrice: found.purchasePrice ? String(found.purchasePrice) : row.purchasePrice,
              sellingPrice: found.promoPrice ? String(found.promoPrice) : String(found.price || ""),
            };
          }
          return { ...row, productId: "" };
        }
        return { ...row, [field]: value };
      })
    );
  }

  async function handleCreateArrival(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!reference.trim()) {
      setFormError("Veuillez indiquer un titre ou une référence pour cet arrivage.");
      return;
    }

    const validItems = draftItems
      .map((it) => ({
        productId: it.productId || null,
        productName: it.productName.trim(),
        quantity: parseInt(it.quantity, 10),
        purchasePrice: parseInt(it.purchasePrice || "0", 10),
        sellingPrice: parseInt(it.sellingPrice || "0", 10),
      }))
      .filter((it) => it.productName !== "" && !isNaN(it.quantity) && it.quantity > 0);

    if (validItems.length === 0) {
      setFormError("Ajoutez au moins une marchandise avec un nom et une quantité valide.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_arrival",
          reference: reference.trim(),
          arrivalDate,
          supplier: supplier.trim(),
          notes: notes.trim(),
          syncCatalog,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Erreur lors de l'enregistrement de l'arrivage.");
        setLoading(false);
        return;
      }

      window.location.reload();
    } catch {
      setFormError("Erreur réseau lors de l'enregistrement.");
      setLoading(false);
    }
  }

  async function handleUpdateSoldQuantity(itemId: string, newSoldQty: number) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_arrival_item",
          itemId,
          soldQuantity: Math.max(0, newSoldQty),
        }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteArrival(arrivalId: string, refName: string) {
    if (!confirm(`Supprimer l'arrivage "${refName}" et son historique de rentabilité ?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stock?arrivalId=${encodeURIComponent(arrivalId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveStock(productId: string, variantId?: string) {
    const val = parseInt(newStockValue, 10);
    if (isNaN(val) || val < 0) return;

    const pa = newPurchasePriceValue !== "" ? parseInt(newPurchasePriceValue, 10) : undefined;
    const pv = newSellingPriceValue !== "" ? parseInt(newSellingPriceValue, 10) : undefined;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_stock",
          productId,
          variantId,
          newStock: val,
          purchasePrice: pa !== undefined && !isNaN(pa) ? pa : undefined,
          price: pv !== undefined && !isNaN(pv) ? pv : undefined,
        }),
      });

      if (res.ok) {
        setEditingId(null);
        window.location.reload();
      } else {
        alert("Erreur de mise à jour.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Stocks, Arrivages & Rentabilité</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Enregistrez vos arrivages, prix d&apos;achat et prix de vente pour suivre le bénéfice de chaque marchandise
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => {
              setActiveTab("arrivals");
              setShowNewArrivalForm((prev) => !prev);
            }}
            className="px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold shadow-sm hover:bg-gray-800 transition-all flex items-center gap-1.5"
          >
            <span>{showNewArrivalForm ? "Fermer le formulaire" : "+ Nouvel Arrivage"}</span>
          </button>
        </div>
      </div>

      {/* CARTES DE SYNTHÈSE FINANCIÈRE DES ARRIVAGES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-gray-500">Coût d&apos;achat cumulé</span>
          <div className="text-lg sm:text-xl font-black text-gray-900">
            {formatMoney(globalArrivalsStats.totalCost, currency, locale)}
          </div>
          <span className="text-[11px] text-gray-400 block">
            {arrivals.length} arrivage{arrivals.length > 1 ? "s" : ""} ({globalArrivalsStats.totalUnits} unités)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-gray-500">Vente totale attendue</span>
          <div className="text-lg sm:text-xl font-black text-gray-900">
            {formatMoney(globalArrivalsStats.expectedRevenue, currency, locale)}
          </div>
          <span className="text-[11px] text-gray-400 block">
            Valeur commerciale des arrivages
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-emerald-800">Bénéfice total attendu</span>
          <div className="text-lg sm:text-xl font-black text-emerald-700">
            +{formatMoney(globalArrivalsStats.expectedProfit, currency, locale)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium block">
            {globalArrivalsStats.totalCost > 0
              ? `Rentabilité : +${Math.round((globalArrivalsStats.expectedProfit / globalArrivalsStats.totalCost) * 100)}%`
              : "Sur l'ensemble des marchandises"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-blue-800">Bénéfice déjà réalisé</span>
          <div className="text-lg sm:text-xl font-black text-blue-700">
            +{formatMoney(globalArrivalsStats.realizedProfit, currency, locale)}
          </div>
          <span className="text-[11px] text-blue-600 font-medium block">
            {globalArrivalsStats.soldUnits} / {globalArrivalsStats.totalUnits} unités écoulées
          </span>
        </div>
      </div>

      {/* BARRE D'ONGLETS : ARRIVAGES vs INVENTAIRE CATALOGUE */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 text-xs font-bold w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("arrivals")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "arrivals" ? "bg-black text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          📦 Arrivages & Bénéfices ({arrivals.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "inventory" ? "bg-black text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          📊 Stock Catalogue & Mouvements ({products.length})
        </button>
      </div>

      {/* ═══════════════════════ ONGLET 1 : ARRIVAGES & RENTABILITÉ ═══════════════════════ */}
      {activeTab === "arrivals" && (
        <div className="space-y-6">
          {/* FORMULAIRE D'AJOUT D'UN NOUVEL ARRIVAGE */}
          {showNewArrivalForm && (
            <form
              onSubmit={handleCreateArrival}
              className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-black shadow-md space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-gray-900">
                    Enregistrer un nouvel arrivage de marchandises
                  </h2>
                  <p className="text-xs text-gray-500">
                    Saisissez la date de l&apos;arrivage et chaque marchandise (quantité, prix d&apos;achat, prix de vente)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewArrivalForm(false)}
                  className="text-gray-400 hover:text-black text-lg font-bold px-2"
                >
                  &times;
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Informations générales de l'arrivage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nom / Référence de l&apos;arrivage *
                  </label>
                  <input
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex: Arrivage Chine #1 - Sacs & Montres"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Date de l&apos;arrivage *
                  </label>
                  <input
                    type="date"
                    required
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Fournisseur / Provenance (optionnel)
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Ex: Guangzhou / Turquie / Grossiste"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* Liste des marchandises de l'arrivage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                    Marchandises de l&apos;arrivage ({draftItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={addDraftItemRow}
                    className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700 transition-all"
                  >
                    + Ajouter une marchandise
                  </button>
                </div>

                <div className="space-y-3">
                  {draftItems.map((item, index) => {
                    const q = Math.max(0, parseInt(item.quantity || "0", 10) || 0);
                    const pa = Math.max(0, parseInt(item.purchasePrice || "0", 10) || 0);
                    const pv = Math.max(0, parseInt(item.sellingPrice || "0", 10) || 0);
                    const unitProfit = pv - pa;
                    const lineCost = q * pa;
                    const lineRev = q * pv;
                    const lineProfit = lineRev - lineCost;

                    return (
                      <div
                        key={item.key}
                        className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-gray-500 uppercase">
                            Marchandise #{index + 1}
                          </span>
                          {draftItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDraftItemRow(item.key)}
                              className="text-xs text-red-600 font-bold hover:underline"
                            >
                              Retirer
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          {/* Sélection produit existant ou nouvelle marchandise */}
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Lier à un article existant (optionnel)
                            </label>
                            <select
                              value={item.productId}
                              onChange={(e) => updateDraftItem(item.key, "productId", e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-xs"
                            >
                              <option value="">-- Nouvelle marchandise / Saisie libre --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (Stock: {p.stock})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Nom de la marchandise */}
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Désignation de la marchandise *
                            </label>
                            <input
                              type="text"
                              required
                              value={item.productName}
                              onChange={(e) => updateDraftItem(item.key, "productName", e.target.value)}
                              placeholder="Ex: Sac à main cuir noir"
                              className="w-full px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold"
                            />
                          </div>

                          {/* Quantité */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Quantité *
                            </label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateDraftItem(item.key, "quantity", e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold"
                            />
                          </div>

                          {/* Prix d'achat unitaire */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Prix d&apos;achat / u ({currency}) *
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={item.purchasePrice}
                              onChange={(e) => updateDraftItem(item.key, "purchasePrice", e.target.value)}
                              placeholder="Ex: 5000"
                              className="w-full px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold"
                            />
                          </div>

                          {/* Prix de vente unitaire */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Prix de vente / u ({currency}) *
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={item.sellingPrice}
                              onChange={(e) => updateDraftItem(item.key, "sellingPrice", e.target.value)}
                              placeholder="Ex: 12000"
                              className="w-full px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold"
                            />
                          </div>
                        </div>

                        {/* Barre de calcul instantané de la marchandise */}
                        <div className="pt-2 border-t border-gray-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex flex-wrap items-center gap-4 text-gray-600">
                            <span>
                              Coût d&apos;achat total :{" "}
                              <strong className="text-gray-900">{formatMoney(lineCost, currency, locale)}</strong>
                            </span>
                            <span>
                              Vente totale :{" "}
                              <strong className="text-gray-900">{formatMoney(lineRev, currency, locale)}</strong>
                            </span>
                            <span>
                              Bénéfice / unité :{" "}
                              <strong className={unitProfit >= 0 ? "text-emerald-700" : "text-red-600"}>
                                {unitProfit >= 0 ? "+" : ""}
                                {formatMoney(unitProfit, currency, locale)}
                              </strong>
                            </span>
                          </div>
                          <div className="font-bold">
                            Bénéfice attendu sur cette marchandise :{" "}
                            <span
                              className={`px-2 py-0.5 rounded-md ${
                                lineProfit >= 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {lineProfit >= 0 ? "+" : ""}
                              {formatMoney(lineProfit, currency, locale)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Option synchronisation & Notes */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncCatalog}
                    onChange={(e) => setSyncCatalog(e.target.checked)}
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span>
                    Mettre à jour automatiquement les quantités en stock et les prix dans le catalogue
                  </span>
                </label>

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note facultative (frais de transport, douane, observations...)"
                  className="w-full sm:w-80 px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                />
              </div>

              {/* Récapitulatif global du nouvel arrivage + bouton de validation */}
              <div className="p-4 rounded-xl bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Coût Total Arrivage</span>
                    <span className="font-black text-sm">{formatMoney(draftSummary.totalCost, currency, locale)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Total Vente Attendu</span>
                    <span className="font-black text-sm">{formatMoney(draftSummary.expectedRevenue, currency, locale)}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 block text-[10px] uppercase font-bold">Bénéfice Net Attendu</span>
                    <span className="font-black text-sm text-emerald-400">
                      +{formatMoney(draftSummary.expectedProfit, currency, locale)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-sm transition-all disabled:opacity-50 shrink-0"
                >
                  {loading ? "Enregistrement..." : "Valider l'arrivage"}
                </button>
              </div>
            </form>
          )}

          {/* LISTE DES ARRIVAGES ENREGISTRÉS */}
          {arrivals.length > 0 ? (
            <div className="space-y-4">
              {arrivals.map((arr) => {
                const items = arr.items || [];
                const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
                const soldUnits = items.reduce((s, i) => s + i.soldQuantity, 0);
                const realizedArrivalProfit = items.reduce(
                  (s, i) => s + i.soldQuantity * (i.sellingPrice - i.purchasePrice),
                  0
                );
                const realizedArrivalRevenue = items.reduce(
                  (s, i) => s + i.soldQuantity * i.sellingPrice,
                  0
                );
                const marginPercent =
                  arr.expectedRevenue > 0
                    ? Math.round((arr.expectedProfit / arr.expectedRevenue) * 100)
                    : 0;

                return (
                  <div
                    key={arr.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden"
                  >
                    {/* En-tête de l'arrivage */}
                    <div className="p-4 sm:p-5 bg-gray-50/70 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-black text-white text-[11px] font-bold">
                            📅{" "}
                            {new Date(arr.arrivalDate).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                          <h3 className="text-base font-black text-gray-900">{arr.reference}</h3>
                          {arr.supplier && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[11px] font-semibold">
                              Fournisseur : {arr.supplier}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {items.length} marchandise{items.length > 1 ? "s" : ""} différente{items.length > 1 ? "s" : ""} •{" "}
                          <strong>{totalUnits}</strong> unités reçues •{" "}
                          <strong className="text-blue-700">{soldUnits}</strong> vendues
                          {arr.notes ? ` • Note : ${arr.notes}` : ""}
                        </p>
                      </div>

                      {/* Résumé financier de cet arrivage */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-xl border border-gray-200">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase block font-semibold">Coût d&apos;achat</span>
                          <span className="font-bold text-gray-900">
                            {formatMoney(arr.totalCost, currency, locale)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase block font-semibold">Vente attendue</span>
                          <span className="font-bold text-gray-900">
                            {formatMoney(arr.expectedRevenue, currency, locale)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700 uppercase block font-bold">
                            Bénéfice attendu ({marginPercent}%)
                          </span>
                          <span className="font-black text-emerald-700">
                            +{formatMoney(arr.expectedProfit, currency, locale)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-blue-700 uppercase block font-bold">
                              Bénéfice réalisé
                            </span>
                            <span className="font-black text-blue-700">
                              +{formatMoney(realizedArrivalProfit, currency, locale)}
                            </span>
                            <span className="block text-[10px] text-gray-400">
                              CA: {formatMoney(realizedArrivalRevenue, currency, locale)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteArrival(arr.id, arr.reference)}
                            title="Supprimer cet arrivage"
                            className="text-gray-400 hover:text-red-600 p-1 text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tableau des marchandises de cet arrivage */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/40 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-4">Marchandise</th>
                            <th className="py-2.5 px-3">Qté Reçue</th>
                            <th className="py-2.5 px-3">Qté Vendue</th>
                            <th className="py-2.5 px-3">Prix d&apos;achat / u</th>
                            <th className="py-2.5 px-3">Prix de vente / u</th>
                            <th className="py-2.5 px-3">Bénéfice / u</th>
                            <th className="py-2.5 px-3">Coût Total</th>
                            <th className="py-2.5 px-3">Bénéfice Attendu</th>
                            <th className="py-2.5 px-4 text-right">Bénéfice Réalisé</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map((it) => {
                            const unitProfit = it.sellingPrice - it.purchasePrice;
                            const realizedItemProfit = it.soldQuantity * unitProfit;
                            const remainingQty = Math.max(0, it.quantity - it.soldQuantity);

                            return (
                              <tr key={it.id} className="hover:bg-gray-50/50">
                                <td className="py-3 px-4 font-bold text-gray-900">
                                  {it.productName}
                                  <span className="block text-[10px] text-gray-400 font-normal">
                                    Reste en stock : {remainingQty}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-bold text-gray-800">{it.quantity}</td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={loading || it.soldQuantity <= 0}
                                      onClick={() => handleUpdateSoldQuantity(it.id, it.soldQuantity - 1)}
                                      className="w-6 h-6 rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-xs font-bold disabled:opacity-40"
                                    >
                                      -
                                    </button>
                                    <span className="font-black text-blue-700 w-7 text-center">
                                      {it.soldQuantity}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={loading || it.soldQuantity >= it.quantity}
                                      onClick={() => handleUpdateSoldQuantity(it.id, it.soldQuantity + 1)}
                                      className="w-6 h-6 rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-xs font-bold disabled:opacity-40"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-gray-700 font-medium">
                                  {formatMoney(it.purchasePrice, currency, locale)}
                                </td>
                                <td className="py-3 px-3 text-gray-900 font-bold">
                                  {formatMoney(it.sellingPrice, currency, locale)}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`font-bold ${
                                      unitProfit >= 0 ? "text-emerald-700" : "text-red-600"
                                    }`}
                                  >
                                    {unitProfit >= 0 ? "+" : ""}
                                    {formatMoney(unitProfit, currency, locale)}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-gray-700">
                                  {formatMoney(it.totalCost, currency, locale)}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold">
                                    +{formatMoney(it.expectedProfit, currency, locale)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-black">
                                    +{formatMoney(realizedItemProfit, currency, locale)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-gray-200 text-center space-y-3">
              <div className="text-3xl">📦</div>
              <h3 className="text-sm font-bold text-gray-900">Aucun arrivage enregistré pour le moment</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Ajoutez vos arrivages avec la date, les différentes marchandises, leurs prix d&apos;achat et leurs prix
                de vente pour calculer automatiquement vos bénéfices attendus et réalisés.
              </p>
              {!showNewArrivalForm && (
                <button
                  type="button"
                  onClick={() => setShowNewArrivalForm(true)}
                  className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold"
                >
                  + Créer mon premier arrivage
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ ONGLET 2 : STOCK CATALOGUE & MOUVEMENTS ═══════════════════════ */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Filtres rapides */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 text-xs font-semibold self-start w-fit">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "all" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tous ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("low")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "low" ? "bg-black text-white" : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              Stock faible (&le; {lowStockThreshold})
            </button>
            <button
              type="button"
              onClick={() => setFilter("out")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "out" ? "bg-black text-white" : "text-red-700 hover:bg-red-50"
              }`}
            >
              Ruptures (0)
            </button>
          </div>

          {/* Grille des articles et ajustement rapide */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            {filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-3">Stock Actuel</th>
                      <th className="py-3 px-3">Prix d&apos;achat</th>
                      <th className="py-3 px-3">Prix de vente</th>
                      <th className="py-3 px-3">Bénéfice / u</th>
                      <th className="py-3 px-3">Bénéfice Stock Restant</th>
                      <th className="py-3 px-4">Ajustement Rapide</th>
                      <th className="py-3 px-4 text-right">Fiche</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((p) => {
                      const isLow = p.trackStock && p.stock > 0 && p.stock <= lowStockThreshold;
                      const isOut = p.trackStock && p.stock <= 0;
                      const sellPrice = p.promoPrice && p.promoPrice < p.price ? p.promoPrice : p.price;
                      const buyPrice = p.purchasePrice || 0;
                      const unitProfit = sellPrice - buyPrice;
                      const stockExpectedProfit = Math.max(0, p.stock) * unitProfit;

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            {p.name}
                            {p.reference && (
                              <span className="text-gray-400 font-mono text-[11px] block">{p.reference}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`font-black text-sm ${
                                isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900"
                              }`}
                            >
                              {p.stock}
                            </span>
                            {isOut && <span className="text-[10px] text-red-600 block font-semibold">Rupture</span>}
                            {isLow && (
                              <span className="text-[10px] text-amber-600 block font-semibold">Stock faible</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-gray-700 font-medium">
                            {formatMoney(buyPrice, currency, locale)}
                          </td>
                          <td className="py-3.5 px-3 font-bold text-gray-900">
                            {formatMoney(sellPrice, currency, locale)}
                          </td>
                          <td className="py-3.5 px-3 font-bold text-emerald-700">
                            +{formatMoney(unitProfit, currency, locale)}
                          </td>
                          <td className="py-3.5 px-3 font-black text-emerald-800">
                            +{formatMoney(stockExpectedProfit, currency, locale)}
                          </td>
                          <td className="py-3.5 px-4">
                            {editingId === p.id ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={newStockValue}
                                  onChange={(e) => setNewStockValue(e.target.value)}
                                  placeholder="Stock"
                                  title="Stock"
                                  className="w-16 px-2 py-1 rounded-lg border border-black text-xs font-bold"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={newPurchasePriceValue}
                                  onChange={(e) => setNewPurchasePriceValue(e.target.value)}
                                  placeholder="Prix achat"
                                  title="Prix d'achat"
                                  className="w-24 px-2 py-1 rounded-lg border border-gray-300 text-xs"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={newSellingPriceValue}
                                  onChange={(e) => setNewSellingPriceValue(e.target.value)}
                                  placeholder="Prix vente"
                                  title="Prix de vente"
                                  className="w-24 px-2 py-1 rounded-lg border border-gray-300 text-xs"
                                />
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => handleSaveStock(p.id)}
                                  className="px-2.5 py-1 rounded-lg bg-black text-white text-[11px] font-bold"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-2 py-1 text-gray-400 hover:text-black"
                                >
                                  &times;
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(p.id);
                                  setNewStockValue(String(p.stock));
                                  setNewPurchasePriceValue(String(p.purchasePrice || 0));
                                  setNewSellingPriceValue(String(p.price || 0));
                                }}
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-[11px]"
                              >
                                Modifier Stock / Prix
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                              Détails &rarr;
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
                Aucun article dans cette catégorie de stock.
              </div>
            )}
          </div>

          {/* Historique des mouvements de stock */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
            <h2 className="font-bold text-sm tracking-tight text-gray-900">
              Journal des mouvements de stock récents
            </h2>

            {movements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 text-gray-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Article</th>
                      <th className="py-2">Mouvement</th>
                      <th className="py-2">Stock Final</th>
                      <th className="py-2">Motif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 text-gray-400 text-[11px]">
                          {new Date(m.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 font-bold text-gray-900">{m.label}</td>
                        <td className="py-2.5 font-bold font-mono">
                          <span className={m.delta > 0 ? "text-emerald-600" : "text-red-600"}>
                            {m.delta > 0 ? `+${m.delta}` : m.delta}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-gray-800">{m.stockAfter}</td>
                        <td className="py-2.5 text-gray-500">
                          {m.reason === "arrival"
                            ? "📦 Arrivage"
                            : m.reason === "order_reserved"
                            ? "Réservé commande"
                            : m.reason === "order_cancelled"
                            ? "Restitué annulation"
                            : m.reason === "manual"
                            ? "Ajustement manuel"
                            : m.reason === "initial"
                            ? "Stock initial"
                            : m.reason}
                          {m.note && <span className="block text-[10px] text-gray-400 italic">{m.note}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">Aucun mouvement enregistré.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
