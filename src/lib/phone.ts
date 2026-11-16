/** Normalise un numéro de téléphone saisi par un client (conserve uniquement + et chiffres). */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const plus = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  return plus ? `+${digits}` : digits;
}

/** Un numéro client est valide s'il contient entre 8 et 15 chiffres. */
export function isValidPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Normalise le numéro WhatsApp du gestionnaire au format international attendu par wa.me :
 * uniquement des chiffres, indicatif pays inclus, sans « + » ni « 00 ».
 */
export function normalizeWhatsappNumber(input: string): string {
  return input.trim().replace(/\D/g, "").replace(/^00/, "");
}

/** Le numéro WhatsApp doit être au format international (10 à 15 chiffres, indicatif inclus). */
export function isValidWhatsappNumber(input: string): boolean {
  const digits = normalizeWhatsappNumber(input);
  return /^[1-9]\d{9,14}$/.test(digits);
}

