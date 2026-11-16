"use client";

import { useState } from "react";

export function ProductCampaignLinkBuilder({
  productSlug,
  productName,
}: {
  productSlug: string;
  productName: string;
}) {
  const [platform, setPlatform] = useState<"tiktok" | "facebook" | "instagram" | "snapchat" | "google" | "custom">("tiktok");
  const [medium, setMedium] = useState("paid_ad");
  const [campaign, setCampaign] = useState("promo1");
  const [copied, setCopied] = useState(false);

  // Déterminer l'URL de base selon l'environnement
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const productPath = `/products/${productSlug}`;

  const generatedUrl = `${baseUrl}${productPath}?utm_source=${platform}&utm_medium=${encodeURIComponent(
    medium
  )}&utm_campaign=${encodeURIComponent(campaign.trim().toLowerCase().replace(/\s+/g, "_"))}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      //
    }
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm tracking-tight text-gray-900 flex items-center gap-2">
            <span>📢</span>
            <span>Générateur de Lien Publicitaire (Attribution Automatique)</span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Créez un lien spécial pour vos publicités TikTok, Facebook ou Instagram afin de suivre chaque vente générée.
          </p>
        </div>
      </div>

      {/* Choix de la plateforme publicitaire */}
      <div>
        <label className="block font-semibold text-gray-700 mb-2">Canal publicitaire :</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "tiktok", label: "TikTok Ads", icon: "🎵", defaultMedium: "paid_ad" },
            { id: "facebook", label: "Facebook / Meta", icon: "📘", defaultMedium: "cpc_ad" },
            { id: "instagram", label: "Instagram Ads / Bio", icon: "📸", defaultMedium: "story_ad" },
            { id: "snapchat", label: "Snapchat Ads", icon: "👻", defaultMedium: "swipe_up" },
            { id: "google", label: "Google Ads", icon: "🔍", defaultMedium: "search_ad" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPlatform(p.id as any);
                setMedium(p.defaultMedium);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                platform === p.id
                  ? "bg-black text-white shadow-xs"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block font-semibold text-gray-700 mb-1">
            Nom de votre campagne :
          </label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="ex: promo_ete, video_danse, solde_2026..."
            className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">
            Format / Support (Medium) :
          </label>
          <input
            type="text"
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            placeholder="paid_ad, story, bio, influenceur..."
            className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* Résultat du lien généré */}
      <div className="pt-2">
        <label className="block font-semibold text-gray-700 mb-1">
          Lien de redirection à insérer dans votre publicité {platform.toUpperCase()} :
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={generatedUrl}
            className="flex-1 px-3 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 text-xs font-mono text-emerald-900 select-all"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-all flex-shrink-0 text-xs flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>Lien copié !</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copier le lien</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">
          Dès qu&apos;un internaute clique sur ce lien dans votre publicité, la boutique identifie automatiquement son origine. Quand il commande, vous saurez exactement que la vente provient de cette publicité.
        </p>
      </div>
    </div>
  );
}

