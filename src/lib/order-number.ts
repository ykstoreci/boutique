import crypto from "node:crypto";

/**
 * Génère un numéro de commande unique et lisible par un humain.
 * Format : CMD-YYYYMMDD-XXXX (ex. CMD-20261111-8K2M)
 */
export function generateOrderNumber(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  // 4 caractères en base 32 (évite 0/O, 1/I pour la lisibilité)
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `CMD-${y}${m}${d}-${code}`;
}

/** Jeton aléatoire pour sécuriser l'accès à la page de confirmation de commande */
export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function hashAccessToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

