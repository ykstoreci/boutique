"use client";

import { useState } from "react";
import { getImageUrl } from "@/lib/images";

export function AdminCategoriesView({
  categories: initialCategories,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [position, setPosition] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  function openCreateModal() {
    setIsEditing(null);
    setName("");
    setDescription("");
    setImageKey(null);
    setIsPublished(true);
    setPosition(categories.length);
    setModalOpen(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openEditModal(cat: any) {
    setIsEditing(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setImageKey(cat.imageKey || null);
    setIsPublished(cat.isPublished);
    setPosition(cat.position || 0);
    setModalOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("images", file);
    formData.append("prefix", "categories");

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.success && data.images[0]) {
        setImageKey(data.images[0].baseKey);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = "/api/admin/categories";
      const method = isEditing ? "PUT" : "POST";
      const payload = {
        id: isEditing || undefined,
        name: name.trim(),
        description: description.trim(),
        imageKey,
        isPublished,
        position,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        window.location.reload();
      } else {
        alert("Erreur lors de l'enregistrement.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous supprimer cette catégorie ?")) return;

    const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert("Erreur de suppression.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Catégories de Produits</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Organisez votre catalogue pour simplifier la navigation mobile
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 active:scale-98 transition-all inline-flex items-center gap-1.5 self-start"
        >
          <span>+ Nouvelle catégorie</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Photo</th>
                  <th className="py-3 px-4">Nom de la catégorie</th>
                  <th className="py-3 px-4">Articles associés</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => {
                  const img = getImageUrl(c.imageKey, "thumbnail");
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">{c.name}</td>
                      <td className="py-3 px-4 text-gray-500">{c.productCount || 0} article(s)</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.isPublished ? "Active" : "Masquée"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 font-semibold hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-gray-400 space-y-2">
            <p>Aucune catégorie configurée.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="text-black font-bold underline"
            >
              Créer votre première catégorie
            </button>
          </div>
        )}
      </div>

      {/* MODAL CRÉATION / MODIFICATION */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </h2>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nom de la catégorie *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Chaussures, Sacs, Accessoires..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description (facultative)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Photo d&apos;illustration</label>
                <div className="flex items-center gap-3">
                  {imageKey && (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(imageKey, "thumbnail") || ""}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <label className="px-3 py-1.5 rounded-lg border border-gray-300 font-semibold cursor-pointer hover:bg-gray-50">
                    {uploading ? "Importation..." : imageKey ? "Changer la photo" : "Choisir une photo"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="catPub"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-black focus:ring-black"
                />
                <label htmlFor="catPub" className="font-semibold text-gray-700">
                  Visible sur la boutique publique
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="px-4 py-1.5 rounded-xl bg-black text-white font-bold hover:bg-gray-800"
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
