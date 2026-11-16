import { formatMoney } from "./money";

export type WhatsappOrderData = {
  number: string;
  mode: "delivery" | "shipping";
  customerName: string;
  customerPhone: string;
  commune?: string | null;
  district?: string | null;
  city?: string | null;
  addressDetails?: string | null;
  items: { name: string; variantName?: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  fee: number | null;
  total: number;
  currency: string;
  locale?: string;
  source?: string | null;
};

export function destinationLabel(d: Pick<WhatsappOrderData, "mode" | "commune" | "district" | "city">): string {
  if (d.mode === "delivery") return [d.commune, d.district].filter((v) => v && v.trim()).join(", ");
  return (d.city ?? "").trim();
}

/**
 * Génère le message WhatsApp prérempli à partir des données RÉELLES de la commande.
 * Aucune variable non remplacée ne peut subsister : chaque ligne est construite à partir de valeurs typées.
 */
export function buildWhatsappMessage(d: WhatsappOrderData): string {
  const money = (v: number) => formatMoney(v, d.currency, d.locale);
  const isDelivery = d.mode === "delivery";
  const lines: string[] = ["Bonjour, je souhaite confirmer ma commande.", "", `NUMÉRO DE COMMANDE : ${d.number}`, ""];

  for (const item of d.items) {
    lines.push(`PRODUIT : ${item.name}${item.variantName ? ` (${item.variantName})` : ""}`);
    lines.push(`QUANTITÉ : ${item.quantity}`);
    lines.push(`PRIX UNITAIRE : ${money(item.unitPrice)}`);
    lines.push("");
  }

  lines.push(`SOUS-TOTAL : ${money(d.subtotal)}`);
  lines.push("");
  lines.push(`MODE DE RÉCEPTION : ${isDelivery ? "LIVRAISON" : "EXPÉDITION"}`);
  lines.push("");
  lines.push(`NOM : ${d.customerName}`);
  lines.push(`TÉLÉPHONE : ${d.customerPhone}`);
  lines.push(`DESTINATION : ${destinationLabel(d)}`);
  if (d.addressDetails && d.addressDetails.trim()) lines.push(`PRÉCISIONS : ${d.addressDetails.trim()}`);
  lines.push("");

  if (d.fee === null) {
    lines.push(`FRAIS DE ${isDelivery ? "LIVRAISON" : "EXPÉDITION"} : À CONFIRMER`);
    lines.push(`MONTANT TOTAL PROVISOIRE (hors frais) : ${money(d.total)}`);
  } else {
    lines.push(`FRAIS DE ${isDelivery ? "LIVRAISON" : "EXPÉDITION"} : ${d.fee === 0 ? "OFFERTS" : money(d.fee)}`);
    lines.push(`MONTANT TOTAL : ${money(d.total)}`);
  }
  lines.push("");
  if (d.source && d.source !== "direct") {
    lines.push(`ORIGINE : Publicité ${d.source.toUpperCase()}`);
  }
  if (isDelivery) lines.push("PAIEMENT : à la livraison");
  lines.push(
    isDelivery
      ? "Merci de me confirmer la livraison de ma commande."
      : "Merci de me confirmer la procédure pour finaliser ma commande (paiement et expédition).",
  );
  return lines.join("\n");
}

export function buildWhatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

