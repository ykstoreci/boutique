"use client";

import { useState } from "react";

export function AdminPagesView({
  pages: initialPages,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pages: any[];
}) {
  const [pagesList, setPagesList] = useState(initialPages);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedPage, setSelectedPage] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [showInFooter, setShowInFooter] = useState(true);
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleSelect(p: any) {
    setSelectedPage(p);
    setTitle(p.title);
    setContent(p.content || "");
    setIsPublished(p.isPublished);
    setShowInFooter(p.showInFooter);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPage) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPage.id,
          title: title.trim(),
          content: content.trim(),
          isPublished,
          showInFooter,
        }),
      });

      if (res.ok) {
        setPagesList((prev) =>
          prev.map((p) =>
            p.id === selectedPage.id
              ? { ...p, title: title.trim(), content: content.trim(), isPublished, showInFooter }
              : p
          )
        );
        alert("Page enregistrée avec succès !");
      } else {
        alert("Erreur lors de l'enregistrement.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Gestion des Pages</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Rédigez et publiez vos conditions de vente, politique de confidentialité et présentation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Liste des pages */}
        <div className="space-y-2">
          {pagesList.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs ${
                selectedPage?.id === p.id
                  ? "border-black bg-black text-white shadow-xs font-bold"
                  : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50 font-semibold"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{p.title}</span>
                <span className="text-[10px] opacity-70 font-mono">/{p.slug}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Éditeur de la page sélectionnée */}
        <div className="md:col-span-2">
          {selectedPage ? (
            <form onSubmit={handleSave} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-sm text-gray-900">
                  Modifier : {selectedPage.title}
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-xl bg-black text-white font-bold text-xs hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Titre de la page</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Contenu texte de la page
                </label>
                <textarea
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Rédigez ici le texte complet de votre page..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-black font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-black"
                  />
                  <span>Page publiée</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={showInFooter}
                    onChange={(e) => setShowInFooter(e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-black"
                  />
                  <span>Afficher le lien dans le pied de page</span>
                </label>
              </div>
            </form>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-gray-200 text-center text-xs text-gray-400">
              Sélectionnez une page à gauche pour modifier son contenu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

