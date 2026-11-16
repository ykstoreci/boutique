"use client";

import { useState } from "react";
import { type ThemeSettings, type ThemeSection, type SectionType, SECTION_LABELS, SECTION_TYPES } from "@/lib/theme/schema";

export function AdminThemeEditor({
  themeId,
  initialSettings,
  initialSections,
  initialVersions,
}: {
  themeId: string;
  initialSettings: ThemeSettings;
  initialSections: ThemeSection[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialVersions: any[];
}) {
  const [settings, setSettings] = useState<ThemeSettings>(initialSettings);
  const [sections, setSections] = useState<ThemeSection[]>(initialSections);
  const [versions, setVersions] = useState(initialVersions);

  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "header_footer" | "product" | "sections" | "versions">("colors");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Helper pour mettre à jour les réglages imbriqués
  function updateSetting<K extends keyof ThemeSettings>(group: K, key: string, value: unknown) {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value,
      },
    }));
  }

  // Enregistrer le brouillon
  async function handleSaveDraft() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings,
          sections,
        }),
      });

      if (res.ok) {
        setIframeKey((k) => k + 1); // Rafraîchir l'aperçu
      } else {
        alert("Erreur lors de l'enregistrement du brouillon.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Publier la version actuelle
  async function handlePublish() {
    const note = prompt("Note de version pour cette publication (facultatif) :", "Mise à jour du design");
    if (note === null) return;

    setPublishing(true);
    try {
      // 1. Sauvegarder d'abord le brouillon
      await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, sections }),
      });

      // 2. Publier
      const res = await fetch("/api/admin/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", note }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Version ${data.version} publiée avec succès sur la boutique publique !`);
        window.location.reload();
      } else {
        alert(data.error || "Erreur lors de la publication.");
      }
    } finally {
      setPublishing(false);
    }
  }

  // Restaurer une ancienne version
  async function handleRestoreVersion(versionId: string) {
    if (!confirm("Voulez-vous charger cette version dans votre éditeur ?")) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", versionId }),
      });

      if (res.ok) {
        alert("Version restaurée dans le brouillon !");
        window.location.reload();
      } else {
        alert("Erreur de restauration.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Gestion des sections
  function handleMoveSection(idx: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[idx];
    newSections[idx] = newSections[targetIdx];
    newSections[targetIdx] = temp;
    setSections(newSections);
  }

  function handleToggleSection(idx: number) {
    setSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  }

  function handleRemoveSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAddSection(type: SectionType) {
    const newSec: ThemeSection = {
      id: crypto.randomUUID(),
      type,
      isEnabled: true,
      settings: {} as never,
    };
    setSections((prev) => [...prev, newSec]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleUpdateSectionSetting(idx: number, key: string, val: any) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === idx
          ? {
              ...s,
              settings: {
                ...s.settings,
                [key]: val,
              },
            }
          : s
      )
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre supérieure d'actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-black tracking-tight">Personnalisation du Thème</h1>
          <p className="text-xs text-gray-500">
            Modifiez l&apos;apparence de votre boutique sans programmation
          </p>
        </div>

        {/* Sélecteur de mode d'aperçu */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPreviewDevice("mobile")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              previewDevice === "mobile" ? "bg-white text-black shadow-xs font-bold" : "text-gray-500 hover:text-black"
            }`}
          >
            <span>📱 Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice("tablet")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              previewDevice === "tablet" ? "bg-white text-black shadow-xs font-bold" : "text-gray-500 hover:text-black"
            }`}
          >
            <span>📱 Tablette</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice("desktop")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              previewDevice === "desktop" ? "bg-white text-black shadow-xs font-bold" : "text-gray-500 hover:text-black"
            }`}
          >
            <span>💻 Ordinateur</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || publishing}
            className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all"
          >
            {saving ? "Sauvegarde..." : "Enregistrer brouillon"}
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={saving || publishing}
            className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 active:scale-95 transition-all"
          >
            {publishing ? "Publication..." : "Publier sur la boutique"}
          </button>
        </div>
      </div>

      {/* Disposition principale : Panneau d'édition à gauche, Prévisualisation à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANNEAU D'ÉDITION GAUCHE */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col text-xs max-h-[82vh]">
          {/* Onglets */}
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/70 p-1.5 gap-1 scrollbar-none flex-shrink-0">
            {[
              { id: "colors", label: "Couleurs" },
              { id: "typography", label: "Typo & Formes" },
              { id: "header_footer", label: "En-tête & Pied" },
              { id: "product", label: "Fiche Produit" },
              { id: "sections", label: "Sections Accueil" },
              { id: "versions", label: "Historique" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as never)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-black shadow-xs"
                    : "text-gray-500 hover:text-black hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenu de l'onglet actif */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* 1. COULEURS */}
            {activeTab === "colors" && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900">Palette de couleurs</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Couleur Principale</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.colors.primary}
                        onChange={(e) => updateSetting("colors", "primary", e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border"
                      />
                      <span className="font-mono text-[11px]">{settings.colors.primary}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Texte sur Principale</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.colors.primaryText}
                        onChange={(e) => updateSetting("colors", "primaryText", e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border"
                      />
                      <span className="font-mono text-[11px]">{settings.colors.primaryText}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Arrière-plan Boutique</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.colors.background}
                        onChange={(e) => updateSetting("colors", "background", e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border"
                      />
                      <span className="font-mono text-[11px]">{settings.colors.background}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Surface Cartes</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.colors.surface}
                        onChange={(e) => updateSetting("colors", "surface", e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border"
                      />
                      <span className="font-mono text-[11px]">{settings.colors.surface}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Couleur du Prix</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.colors.price}
                        onChange={(e) => updateSetting("colors", "price", e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border"
                      />
                      <span className="font-mono text-[11px]">{settings.colors.price}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Badge Promotion</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.colors.sale}
                        onChange={(e) => updateSetting("colors", "sale", e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border"
                      />
                      <span className="font-mono text-[11px]">{settings.colors.sale}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TYPOGRAPHIE & FORMES */}
            {activeTab === "typography" && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Police des Titres</label>
                  <select
                    value={settings.typography.headingFont}
                    onChange={(e) => updateSetting("typography", "headingFont", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                  >
                    <option value="system">Système (Rapide, iOS natif)</option>
                    <option value="inter">Inter (Moderne & Épuré)</option>
                    <option value="dm-sans">DM Sans</option>
                    <option value="montserrat">Montserrat (Impactant)</option>
                    <option value="playfair">Playfair Display (Luxe & Élégance)</option>
                    <option value="lora">Lora (Classique)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Arrondi des Boutons ({settings.shape.buttonRadius}px)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={settings.shape.buttonRadius}
                    onChange={(e) => updateSetting("shape", "buttonRadius", parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Arrondi des Cartes Produits ({settings.shape.cardRadius}px)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={settings.shape.cardRadius}
                    onChange={(e) => updateSetting("shape", "cardRadius", parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* 3. EN-TÊTE & PIED DE PAGE */}
            {activeTab === "header_footer" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900">En-tête de page</h4>
                  <div>
                    <label className="block text-gray-600 mb-1">Barre d&apos;annonce (facultative)</label>
                    <input
                      type="text"
                      placeholder="Ex : Livraison offerte à partir de 50 000 F CFA !"
                      value={settings.header.announcement}
                      onChange={(e) => updateSetting("header", "announcement", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="stickyHeader"
                      checked={settings.header.sticky}
                      onChange={(e) => updateSetting("header", "sticky", e.target.checked)}
                      className="w-4 h-4 rounded text-black focus:ring-black"
                    />
                    <label htmlFor="stickyHeader" className="font-semibold text-gray-700">
                      En-tête fixé en haut de l&apos;écran au défilement (Sticky)
                    </label>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-bold text-gray-900">Pied de page</h4>
                  <div>
                    <label className="block text-gray-600 mb-1">Texte de présentation du footer</label>
                    <textarea
                      rows={2}
                      value={settings.footer.text}
                      onChange={(e) => updateSetting("footer", "text", e.target.value)}
                      placeholder="Quelques mots sur votre boutique..."
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. FICHE PRODUIT */}
            {activeTab === "product" && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Format de photo produit</label>
                  <select
                    value={settings.product.imageAspect}
                    onChange={(e) => updateSetting("product", "imageAspect", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                  >
                    <option value="square">Carré (1:1)</option>
                    <option value="portrait">Portrait (3:4 - Idéal Mode)</option>
                    <option value="landscape">Paysage (16:9)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="showStockCheck"
                    checked={settings.product.showStock}
                    onChange={(e) => updateSetting("product", "showStock", e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-black"
                  />
                  <label htmlFor="showStockCheck" className="font-semibold text-gray-700">
                    Afficher la quantité restante en stock sur la fiche
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="showSimilarCheck"
                    checked={settings.product.showSimilar}
                    onChange={(e) => updateSetting("product", "showSimilar", e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-black"
                  />
                  <label htmlFor="showSimilarCheck" className="font-semibold text-gray-700">
                    Afficher la section &laquo; Produits similaires &raquo;
                  </label>
                </div>

                {settings.product.showSimilar && (
                  <div>
                    <label className="block text-gray-600 mb-1">Titre de la section similaires</label>
                    <input
                      type="text"
                      value={settings.product.similarTitle}
                      onChange={(e) => updateSetting("product", "similarTitle", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5. SECTIONS DE LA PAGE D'ACCUEIL */}
            {activeTab === "sections" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-900">Blocs de la page d&apos;accueil</h4>
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-black text-white text-[11px] font-bold"
                    >
                      + Ajouter un bloc
                    </button>
                    <div className="absolute right-0 top-full hidden group-hover:block w-48 py-1.5 bg-white rounded-xl shadow-xl border z-50">
                      {SECTION_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleAddSection(t)}
                          className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-[11px] font-medium"
                        >
                          {SECTION_LABELS[t]?.label || t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {sections.map((sec, idx) => (
                    <div
                      key={sec.id}
                      className={`p-3 rounded-xl border transition-all ${
                        sec.isEnabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSection(idx)}
                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                              sec.isEnabled ? "bg-emerald-600 text-white" : "bg-gray-300 text-gray-600"
                            }`}
                          >
                            {sec.isEnabled ? "✓" : ""}
                          </button>
                          <span className="font-bold text-xs">{SECTION_LABELS[sec.type]?.label || sec.type}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSection(idx, "up")}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                          >
                            &uarr;
                          </button>
                          <button
                            type="button"
                            disabled={idx === sections.length - 1}
                            onClick={() => handleMoveSection(idx, "down")}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                          >
                            &darr;
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded ml-1"
                          >
                            &times;
                          </button>
                        </div>
                      </div>

                      {/* Champs spécifiques à la section */}
                      {sec.type === "hero" && (
                        <div className="space-y-2 pt-1 border-t text-[11px]">
                          <input
                            type="text"
                            placeholder="Titre de la bannière"
                            value={(sec.settings as any).title || ""}
                            onChange={(e) => handleUpdateSectionSetting(idx, "title", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-gray-300"
                          />
                          <input
                            type="text"
                            placeholder="Sous-titre"
                            value={(sec.settings as any).subtitle || ""}
                            onChange={(e) => handleUpdateSectionSetting(idx, "subtitle", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-gray-300"
                          />
                        </div>
                      )}

                      {sec.type === "text" && (
                        <div className="space-y-2 pt-1 border-t text-[11px]">
                          <input
                            type="text"
                            placeholder="Titre du texte"
                            value={(sec.settings as any).title || ""}
                            onChange={(e) => handleUpdateSectionSetting(idx, "title", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-gray-300"
                          />
                          <textarea
                            rows={2}
                            placeholder="Paragraphe"
                            value={(sec.settings as any).body || ""}
                            onChange={(e) => handleUpdateSectionSetting(idx, "body", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-gray-300"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. HISTORIQUE DES VERSIONS */}
            {activeTab === "versions" && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900">Historique des publications</h4>
                {versions.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {versions.map((v) => (
                      <div key={v.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs block">Version {v.version}</span>
                          <span className="text-[11px] text-gray-500">{v.note}</span>
                          <span className="text-[10px] text-gray-400 block">
                            {new Date(v.createdAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(v.id)}
                          className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-100"
                        >
                          Restaurer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 py-6 text-center">Aucune version publiée pour le moment.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PANNEAU DE PRÉVISUALISATION DROITE (Simulateur iPhone / Tablette / Desktop) */}
        <div className="lg:col-span-7 flex justify-center items-start">
          <div
            className={`transition-all duration-300 bg-gray-900 rounded-3xl p-3 shadow-2xl border-4 border-gray-800 ${
              previewDevice === "mobile"
                ? "w-[375px] h-[720px]"
                : previewDevice === "tablet"
                ? "w-[768px] h-[800px]"
                : "w-full h-[800px]"
            }`}
          >
            {/* Encoche iPhone si en mode mobile */}
            {previewDevice === "mobile" && (
              <div className="w-32 h-4 bg-black rounded-b-xl mx-auto mb-2" />
            )}

            <div className="w-full h-full bg-white rounded-2xl overflow-hidden shadow-inner">
              <iframe
                key={iframeKey}
                src="/admin/theme/preview"
                title="Prévisualisation du thème"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
