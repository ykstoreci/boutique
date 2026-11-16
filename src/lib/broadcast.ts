/**
 * Utilitaire de diffusion temps réel entre les onglets (Admin <-> Boutique publique).
 * Zéro latence (0ms), fonctionne dans tous les navigateurs modernes.
 */

export type RealtimeEvent =
  | { type: "new_order"; order: unknown }
  | { type: "stock_updated"; productId?: string }
  | { type: "store_updated" }
  | { type: "theme_updated" };

export function broadcastRealtimeEvent(event: RealtimeEvent) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return;
  }
  try {
    const ch = new BroadcastChannel("boutique_realtime");
    ch.postMessage(event);
    ch.close();
  } catch (err) {
    console.warn("Échec de diffusion BroadcastChannel :", err);
  }
}
