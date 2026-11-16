"use client";

import { useState } from "react";
import Link from "next/link";
import { getImageUrl } from "@/lib/images";

export function AdminProductForm({
  initialData,
  categories,
  currency = "XOF",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
  categories: { id: string; name: string }[];
  currency?: string;
}) {
  const isEditing = !!initialData?.id;

  const [name, setName] = useState(initialData?.name || "");
  const [reference, setReference] = useState(initialData?.reference || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : "");
  const [promoPrice, setPromoPrice] = useState(initialData?.promoPrice ? String(initialData.promoPrice) : "");
  const [stock, setStock] = useState(initialData?.stock !== undefined ? String(initialData.stock) : "0");
  const [trackStock, setTrackStock] = useState(initialData?.trackStock !== false);
  const [status, setStatus] = useState<"draft" | "published">(initialData?.status || "draft");
  const [isFeatured, setIsFeatured] = useState(!!initialData?.isFeatured);

  // Images : array of { storageKey, isMain, alt, position }
  const [images, setImages] = useState<
    { storageKey: string; isMain: boolean; alt?: string; position?: number }[]
  >(initialData?.images || []);

  // Variantes : array of { id, name, sku, price, stock, isActive }
  const [variants, setVariants] = useState<
    { id?: string; name: string; sku?: string; price?: number | null; stock: number; isActive: boolean }[]
  >(initialData?.variants || []);

  // Caractéristiques : array of { label, value }
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(
    initialData?.specs || []
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gestion des uploads d'images
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }
    formData.append("prefix", "products");

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newImages = data.images.map((img: any, idx: number) => ({
          storageKey: img.baseKey,
          isMain: images.length === 0 && idx === 0,
          alt: name || "Photo produit",
          position: images.length + idx,
        }));
        setImages((prev) => [...prev, ...newImages]);
      } else {
        setError(data.error || "Erreur lors du téléchargement.");
      }
    } catch {
      setError("Erreur réseau lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  function handleSetMainImage(index: number) {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isMain: i === index,
      }))
    );
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some((img) => img.isMain)) {
        filtered[0].isMain = true;
      }
      return filtered;
    });
  }

  // Variantes
  function handleAddVariant() {
    setVariants((prev) => [
      ...prev,
      { name: "", sku: "", price: null, stock: 0, isActive: true },
    ]);
  }

  function handleRemoveVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleUpdateVariant(idx: number, field: string, val: any) {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v))
    );
  }

  // Caractéristiques
  function handleAddSpec() {
    setSpecs((prev) => [...prev, { label: "", value: "" }]);
  }

  function handleRemoveSpec(idx: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleUpdateSpec(idx: number, field: "label" | "value", val: string) {
    setSpecs((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );
  }

  // Dupliquer le produit
  async function handleDuplicate() {
    if (!initialData?.id) return;
    if (!confirm("Voulez-vous dupliquer cet article ?")) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", productId: initialData.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = `/admin/products/${data.productId}`;
      } else {
        alert(data.error || "Erreur lors de la duplication.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Supprimer le produit
  async function handleDelete() {
    if (!initialData?.id) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement cet article ?")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${initialData.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.location.href = "/admin/products";
      } else {
        alert("Impossible de supprimer cet article.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Soumission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: name.trim(),
      reference: reference.trim() || undefined,
      slug: slug.trim() || undefined,
      categoryId: categoryId || undefined,
      description: description.trim(),
      price: parseInt(price, 10) || 0,
      promoPrice: promoPrice ? parseInt(promoPrice, 10) : null,
      stock: parseInt(stock, 10) || 0,
      trackStock,
      status,
      isFeatured,
      images,
      variants: variants.filter((v) => v.name.trim() !== ""),
      specs: specs.filter((s) => s.label.trim() !== "" && s.value.trim() !== ""),
    };

    try {
      const url = isEditing ? `/api/admin/products/${initialData.id}` : "/api/admin/products";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = "/admin/products";
      } else {
        setError(data.error || "Erreur d'enregistrement.");
      }
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin/products" className="text-xs text-gray-500 hover:underline">
            &larr; Retour à la liste
          </Link>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            {isEditing ? `Modifier : ${name || "Article"}` : "Nouvel article"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                Dupliquer
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-all"
              >
                Supprimer
              </button>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 active:scale-98 transition-all disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer l'article"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Bloc 1 : Informations générales */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">Informations générales</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1">
              Nom du produit *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Chaussures Richelieu en Cuir Noir"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Référence / SKU (facultatif)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex : RCH-001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="">Aucune catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1">
              Description détaillée
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les atouts, la matière, l'utilisation..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {/* Bloc 2 : Galerie de photos WebP */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm tracking-tight text-gray-900">Photos de l&apos;article</h2>
            <p className="text-[11px] text-gray-500">
              Format WebP optimisé automatiquement en 3 résolutions (400, 800, 1600px).
            </p>
          </div>
          <label className="px-3 py-1.5 rounded-xl bg-black text-white text-xs font-semibold cursor-pointer hover:bg-gray-800 transition-all">
            {uploading ? "Importation..." : "+ Ajouter des photos"}
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={uploading}
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((img, idx) => {
              const url = getImageUrl(img.storageKey, "thumbnail");
              return (
                <div
                  key={idx}
                  className={`relative rounded-xl overflow-hidden border-2 bg-gray-50 aspect-square group ${
                    img.isMain ? "border-black shadow-xs" : "border-gray-200"
                  }`}
                >
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={img.alt || ""} className="w-full h-full object-cover" />
                  )}

                  {img.isMain && (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black text-white text-[10px] font-bold">
                      Principale
                    </span>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                    {!img.isMain && (
                      <button
                        type="button"
                        onClick={() => handleSetMainImage(idx)}
                        className="px-2 py-1 rounded bg-white text-black text-[10px] font-bold hover:bg-gray-100"
                      >
                        Mettre en principale
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">
            Aucune photo importée pour cet article.
          </div>
        )}
      </div>

      {/* Bloc 3 : Prix & Stock */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">Tarification & Stock</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Prix de vente ({currency}) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex : 25000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black font-semibold"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Prix promotionnel (facultatif)
            </label>
            <input
              type="number"
              min="0"
              value={promoPrice}
              onChange={(e) => setPromoPrice(e.target.value)}
              placeholder="Ex : 19000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Stock disponible
            </label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              disabled={variants.length > 0}
              placeholder="Ex : 15"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
            />
            {variants.length > 0 && (
              <span className="text-[10px] text-gray-400 mt-1 block">
                Géré par les variantes ci-dessous.
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="trackStock"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
            className="w-4 h-4 rounded text-black focus:ring-black"
          />
          <label htmlFor="trackStock" className="font-semibold text-gray-700 select-none">
            Activer le suivi automatique des stocks pour cet article
          </label>
        </div>
      </div>

      {/* Bloc 4 : Variantes (Tailles, Couleurs, etc.) */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm tracking-tight text-gray-900">Variantes du produit</h2>
            <p className="text-[11px] text-gray-500">
              Ex : Tailles (39, 40, 41), Couleurs, Modèles spécifiques avec stock dédié.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold hover:bg-gray-50"
          >
            + Ajouter une variante
          </button>
        </div>

        {variants.length > 0 && (
          <div className="space-y-2">
            {variants.map((v, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <input
                  type="text"
                  required
                  placeholder="Nom (Ex : Taille 42)"
                  value={v.name}
                  onChange={(e) => handleUpdateVariant(idx, "name", e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Prix spécifique (facultatif)"
                  value={v.price ?? ""}
                  onChange={(e) => handleUpdateVariant(idx, "price", e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-32 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) => handleUpdateVariant(idx, "stock", parseInt(e.target.value, 10) || 0)}
                  className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(idx)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bloc 5 : Publication */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 text-xs">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">Visibilité & Publication</h2>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value="draft"
              checked={status === "draft"}
              onChange={() => setStatus("draft")}
              className="text-black focus:ring-black"
            />
            <span className="font-semibold text-gray-700">Brouillon (non visible sur la boutique)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value="published"
              checked={status === "published"}
              onChange={() => setStatus("published")}
              className="text-black focus:ring-black"
            />
            <span className="font-semibold text-gray-700">Publié (visible et commandable)</span>
          </label>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded text-black focus:ring-black"
            />
            <span className="font-semibold text-gray-700">Mettre en avant sur la boutique</span>
          </label>
        </div>
      </div>
    </form>
  );
}
