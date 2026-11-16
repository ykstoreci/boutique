/**
 * Module d'attribution marketing et de détection des origines publicitaires
 * (TikTok Ads, Facebook Ads, Instagram, Google, etc.)
 */

export type AttributionData = {
  source: string; // "tiktok" | "facebook" | "instagram" | "google" | "youtube" | "snapchat" | "x" | "whatsapp" | "direct" | autre
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  landingUrl?: string | null;
  capturedAt?: string;
};

const STORAGE_KEY = "btq_marketing_attribution";

export function detectSourceFromReferrer(refUrl: string): string | null {
  if (!refUrl) return null;
  try {
    const hostname = new URL(refUrl).hostname.toLowerCase();
    if (hostname.includes("tiktok.com") || hostname.includes("bytedance")) return "tiktok";
    if (hostname.includes("facebook.com") || hostname.includes("fb.me") || hostname.includes("fb.com")) return "facebook";
    if (hostname.includes("instagram.com")) return "instagram";
    if (hostname.includes("google.")) return "google";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    if (hostname.includes("snapchat.com")) return "snapchat";
    if (hostname.includes("twitter.com") || hostname.includes("t.co") || hostname.includes("x.com")) return "x";
    if (hostname.includes("whatsapp.com") || hostname.includes("wa.me")) return "whatsapp";
    if (hostname.includes("linkedin.com") || hostname.includes("lnkd.in")) return "linkedin";
    if (hostname.includes("pinterest.com")) return "pinterest";
    return hostname;
  } catch {
    return null;
  }
}

/**
 * Capture les paramètres de tracking dès l'arrivée du visiteur sur le site.
 */
export function captureAttribution(): AttributionData {
  if (typeof window === "undefined") {
    return { source: "direct" };
  }

  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    const utmSource = searchParams.get("utm_source") || searchParams.get("source") || searchParams.get("ref");
    const utmMedium = searchParams.get("utm_medium") || searchParams.get("medium");
    const utmCampaign = searchParams.get("utm_campaign") || searchParams.get("campaign");
    const docReferrer = document.referrer || null;

    let detectedSource = "direct";
    if (utmSource && utmSource.trim()) {
      detectedSource = utmSource.trim().toLowerCase();
    } else if (docReferrer) {
      const fromRef = detectSourceFromReferrer(docReferrer);
      if (fromRef) detectedSource = fromRef;
    }

    // Normalisation des noms de plateformes courantes
    if (detectedSource.includes("tiktok")) detectedSource = "tiktok";
    else if (detectedSource.includes("facebook") || detectedSource === "fb") detectedSource = "facebook";
    else if (detectedSource.includes("instagram") || detectedSource === "ig") detectedSource = "instagram";
    else if (detectedSource.includes("google")) detectedSource = "google";
    else if (detectedSource.includes("snapchat") || detectedSource === "snap") detectedSource = "snapchat";
    else if (detectedSource.includes("twitter") || detectedSource === "x") detectedSource = "x";
    else if (detectedSource.includes("youtube")) detectedSource = "youtube";
    else if (detectedSource.includes("whatsapp")) detectedSource = "whatsapp";

    // Si on arrive avec des paramètres explicites de pub, on écrase ou on crée
    if (utmSource || (detectedSource !== "direct" && !sessionStorage.getItem(STORAGE_KEY))) {
      const data: AttributionData = {
        source: detectedSource,
        utmSource: utmSource ? utmSource.trim() : null,
        utmMedium: utmMedium ? utmMedium.trim() : null,
        utmCampaign: utmCampaign ? utmCampaign.trim() : null,
        referrer: docReferrer ? docReferrer.slice(0, 500) : null,
        landingUrl: window.location.href.slice(0, 500),
        capturedAt: new Date().toISOString(),
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Ignorer si localStorage désactivé
      }
      return data;
    }

    // Sinon, récupérer l'attribution déjà mémorisée de la session en cours
    const stored = getStoredAttribution();
    if (stored) return stored;

    // Dernier recours : direct
    const directData: AttributionData = {
      source: "direct",
      referrer: docReferrer ? docReferrer.slice(0, 500) : null,
    };
    return directData;
  } catch {
    return { source: "direct" };
  }
}

/**
 * Récupère l'attribution mémorisée du client au moment de passer commande.
 */
export function getStoredAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;
  try {
    const rawSession = sessionStorage.getItem(STORAGE_KEY);
    if (rawSession) return JSON.parse(rawSession);
    const rawLocal = localStorage.getItem(STORAGE_KEY);
    if (rawLocal) return JSON.parse(rawLocal);
  } catch {
    //
  }
  return null;
}

/**
 * Libellé, icône et couleur pour l'affichage dans l'espace administrateur.
 */
export function getSourceDisplay(source: string): {
  label: string;
  icon: string;
  badgeClass: string;
} {
  const s = source?.toLowerCase() || "direct";

  switch (s) {
    case "tiktok":
      return {
        label: "TikTok",
        icon: "🎵",
        badgeClass: "bg-black text-white border-black",
      };
    case "facebook":
      return {
        label: "Facebook",
        icon: "📘",
        badgeClass: "bg-blue-600 text-white border-blue-600",
      };
    case "instagram":
      return {
        label: "Instagram",
        icon: "📸",
        badgeClass: "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white border-transparent",
      };
    case "google":
      return {
        label: "Google",
        icon: "🔍",
        badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
      };
    case "snapchat":
      return {
        label: "Snapchat",
        icon: "👻",
        badgeClass: "bg-yellow-400 text-black border-yellow-500",
      };
    case "whatsapp":
      return {
        label: "WhatsApp",
        icon: "💬",
        badgeClass: "bg-emerald-600 text-white border-emerald-600",
      };
    case "youtube":
      return {
        label: "YouTube",
        icon: "▶️",
        badgeClass: "bg-red-600 text-white border-red-600",
      };
    case "x":
      return {
        label: "X (Twitter)",
        icon: "𝕏",
        badgeClass: "bg-gray-900 text-white border-gray-900",
      };
    case "direct":
    default:
      return {
        label: s === "direct" ? "Accès direct" : s,
        icon: "🌐",
        badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
      };
  }
}

