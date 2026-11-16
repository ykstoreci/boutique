/**
 * Gestion des montants.
 * Les montants sont manipulés en entiers dans la plus petite unité de la devise
 * (ex. 1 500 XOF = 1500 ; 12,50 EUR = 1250).
 */

export function currencyDecimals(currency: string): number {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** Formate un montant en unité mineure pour l'affichage (ex. « 15 000 F CFA »). */
export function formatMoney(minor: number, currency: string, locale = "fr-FR"): string {
  const decimals = currencyDecimals(currency);
  const value = minor / 10 ** decimals;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
      .format(value)
      // Espaces insécables fines → espaces insécables simples (meilleur rendu dans WhatsApp)
      .replace(/\u202f/g, "\u00a0");
  } catch {
    return `${value.toFixed(decimals)} ${currency}`;
  }
}

/** Convertit une saisie (« 15000 », « 12,50 », « 15 000 ») en unité mineure. Retourne null si invalide. */
export function parseMoneyInput(input: string | number | null | undefined, currency: string): number | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (raw === "") return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const decimals = currencyDecimals(currency);
  const [intPart, fracPart = ""] = raw.split(".");
  if (fracPart.length > decimals) return null;
  const minor = Number(intPart) * 10 ** decimals + Number((fracPart + "0".repeat(decimals)).slice(0, decimals) || 0);
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

/** Valeur d'un montant pour pré-remplir un champ de saisie (« 12.50 » ou « 15000 »). */
export function moneyToInput(minor: number | null | undefined, currency: string): string {
  if (minor === null || minor === undefined) return "";
  const decimals = currencyDecimals(currency);
  return decimals === 0 ? String(minor) : (minor / 10 ** decimals).toFixed(decimals);
}

/** Prix effectif (promotion si définie et inférieure au prix). */
export function effectivePrice(price: number, promoPrice: number | null | undefined): number {
  return promoPrice !== null && promoPrice !== undefined && promoPrice < price ? promoPrice : price;
}

