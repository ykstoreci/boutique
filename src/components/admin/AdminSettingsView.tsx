"use client";

import { useState } from "react";
import { getImageUrl } from "@/lib/images";

export function AdminSettingsView({
  settings: initialSettings,
  admin,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  admin?: { id: string; email: string; name: string };
}) {
  const [storeName, setStoreName] = useState(initialSettings?.storeName || "");
  const [tagline, setTagline] = useState(initialSettings?.tagline || "");
  const [logoKey, setLogoKey] = useState<string | null>(initialSettings?.logoKey || null);
  const [faviconKey, setFaviconKey] = useState<string | null>(initialSettings?.faviconKey || null);
  const [phone, setPhone] = useState(initialSettings?.phone || "");
  const [whatsappNumber, setWhatsappNumber] = useState(initialSettings?.whatsappNumber || "");
  const [email, setEmail] = useState(initialSettings?.email || "");
  const [address, setAddress] = useState(initialSettings?.address || "");
  const [country, setCountry] = useState(initialSettings?.country || "Côte d'Ivoire");
  const [currency, setCurrency] = useState(initialSettings?.currency || "XOF");
  const [timezone, setTimezone] = useState(initialSettings?.timezone || "Africa/Abidjan");
  const [locale, setLocale] = useState(initialSettings?.locale || "fr-FR");
  const [ordersEnabled, setOrdersEnabled] = useState(!!initialSettings?.ordersEnabled);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialSettings?.lowStockThreshold !== undefined ? String(initialSettings.lowStockThreshold) : "3"
  );

  // Profil & Sécurité administrateur
  const [adminName, setAdminName] = useState(admin?.name || "Propriétaire");
  const [adminEmail, setAdminEmail] = useState(admin?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Réseaux sociaux
  const [facebook, setFacebook] = useState(initialSettings?.socialLinks?.facebook || "");
  const [instagram, setInstagram] = useState(initialSettings?.socialLinks?.instagram || "");
  const [tiktok, setTiktok] = useState(initialSettings?.socialLinks?.tiktok || "");
  const [youtube, setYoutube] = useState(initialSettings?.socialLinks?.youtube || "");
  const [x, setX] = useState(initialSettings?.socialLinks?.x || "");

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("images", file);
    formData.append("prefix", "brand");

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.success && data.images[0]) {
        setLogoKey(data.images[0].baseKey);
      }
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload = {
      storeName: storeName.trim(),
      tagline: tagline.trim(),
      logoKey,
      faviconKey,
      phone: phone.trim(),
      whatsappNumber: whatsappNumber.trim(),
      email: email.trim(),
      address: address.trim(),
      country: country.trim(),
      currency,
      timezone,
      locale,
      ordersEnabled,
      lowStockThreshold: parseInt(lowStockThreshold, 10) || 3,
      socialLinks: {
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        tiktok: tiktok.trim(),
        youtube: youtube.trim(),
        x: x.trim(),
      },
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", text: "Paramètres enregistrés avec succès !" });
      } else {
        setFeedback({ type: "error", text: data.error || "Erreur d'enregistrement." });
      }
    } catch {
      setFeedback({ type: "error", text: "Erreur de connexion." });
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback(null);

    if (newPassword && newPassword !== confirmPassword) {
      setProfileFeedback({ type: "error", text: "Les deux nouveaux mots de passe ne correspondent pas." });
      setProfileSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProfileFeedback({ type: "success", text: data.message || "Profil mis à jour avec succès !" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setProfileFeedback({ type: "error", text: data.error || "Erreur de mise à jour du profil." });
      }
    } catch {
      setProfileFeedback({ type: "error", text: "Erreur de connexion lors de la mise à jour." });
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl text-xs">
      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Paramètres Généraux</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Identité de la boutique, contact WhatsApp commercial et préférences
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 active:scale-98 transition-all disabled:opacity-50 self-start"
        >
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl font-semibold border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Bloc 1 : PRISE DE COMMANDE & CONTACT WHATSAPP (Règle Fondamentale) */}
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm tracking-tight text-amber-900">
              Système de Commande & Contact WhatsApp
            </h2>
            <p className="text-[11px] text-amber-800 mt-0.5">
              C&apos;est le numéro WhatsApp auquel seront transmises toutes les commandes de la boutique.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ordersSwitch"
              checked={ordersEnabled}
              onChange={(e) => setOrdersEnabled(e.target.checked)}
              className="w-5 h-5 rounded text-black focus:ring-black"
            />
            <label htmlFor="ordersSwitch" className="font-bold text-amber-950 select-none">
              Commandes Actives
            </label>
          </div>
        </div>

        <div>
          <label className="block font-bold text-amber-950 mb-1">
            Numéro WhatsApp Professionnel du Gestionnaire *
          </label>
          <input
            type="text"
            required={ordersEnabled}
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="Ex : 2250700000000 (Indicatif international + numéro, sans espace)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-[10px] text-amber-800 mt-1">
            Format requis : Chiffres uniquement avec l&apos;indicatif pays. Exemple pour la Côte d&apos;Ivoire : <strong>2250701020304</strong>.
          </p>
        </div>
      </div>

      {/* Bloc 2 : Identité de la boutique */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">Identité visuelle & Nom</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nom de la boutique *</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ex : Élégance Abidjan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Slogan ou sous-titre</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ex : Prêt-à-porter & Accessoires de luxe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1">Logo de la boutique</label>
            <div className="flex items-center gap-4">
              {logoKey && (
                <div className="p-2 border rounded-xl bg-gray-50 h-16 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getImageUrl(logoKey, "medium") || ""} alt="Logo" className="max-h-12 w-auto object-contain" />
                </div>
              )}
              <label className="px-3 py-1.5 rounded-lg border border-gray-300 font-semibold cursor-pointer hover:bg-gray-50">
                {uploadingLogo ? "Téléchargement..." : logoKey ? "Changer le logo" : "Importer un logo"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingLogo}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bloc 3 : Coordonnées de contact */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">Coordonnées de l&apos;entreprise</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Téléphone d&apos;appel</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : +225 07 00 00 00 00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Adresse email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@boutique.ci"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Adresse physique / Siège</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex : Abidjan, Cocody 2 Plateaux"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Pays</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ex : Côte d'Ivoire"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {/* Bloc 4 : Devise & Paramètres d'inventaire */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">Devise & Stocks</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Devise de la boutique</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold bg-white"
            >
              <option value="XOF">Franc CFA (FCFA / XOF)</option>
              <option value="XAF">Franc CFA Afrique Centrale (XAF)</option>
              <option value="GNF">Franc Guinéen (GNF)</option>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar US ($)</option>
              <option value="CAD">Dollar Canadien ($)</option>
              <option value="MAD">Dirham Marocain (MAD)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Fuseau horaire</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Seuil alerte stock faible</label>
            <input
              type="number"
              min="1"
              max="100"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Bloc 5 : Réseaux sociaux */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <h2 className="font-bold text-sm tracking-tight text-gray-900">Liens Réseaux Sociaux</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Facebook URL</label>
            <input
              type="url"
              placeholder="https://facebook.com/maboutique"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Instagram URL</label>
            <input
              type="url"
              placeholder="https://instagram.com/maboutique"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">TikTok URL</label>
            <input
              type="url"
              placeholder="https://tiktok.com/@maboutique"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">YouTube URL</label>
            <input
              type="url"
              placeholder="https://youtube.com/@maboutique"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
            />
          </div>
        </div>
      </div>
      </form>

      {/* Bloc 6 : Sécurité & Compte Propriétaire */}
      <form onSubmit={handleProfileSubmit} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm tracking-tight text-gray-900">Compte Propriétaire & Sécurité</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Modifiez votre nom, votre adresse email de connexion et votre mot de passe administrateur
            </p>
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold transition-all disabled:opacity-50 text-xs shadow-xs"
          >
            {profileSaving ? "Mise à jour..." : "Mettre à jour mon compte"}
          </button>
        </div>

        {profileFeedback && (
          <div
            className={`p-3 rounded-xl font-semibold text-xs ${
              profileFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {profileFeedback.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nom du propriétaire</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Adresse email de connexion</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mt-2">
          <h3 className="font-bold text-xs text-gray-900 mb-3">Changer le mot de passe (facultatif)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                placeholder="Min. 8 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
