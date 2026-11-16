"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  playNewOrderSound,
  playNotificationSound,
  unlockAudio,
  getSoundPreference,
  setSoundPreference,
} from "@/lib/sound";
import { formatMoney } from "@/lib/money";

export interface LiveOrderPayload {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  total: number;
  currency: string;
  mode: "delivery" | "shipping";
  commune: string | null;
  district: string | null;
  city: string | null;
  status: string;
  createdAt: string;
  source?: string | null;
}

export function AdminLiveAlerts() {
  const router = useRouter();
  const pathname = usePathname();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeAlert, setActiveAlert] = useState<LiveOrderPayload | null>(null);
  const [connected, setConnected] = useState(true);

  // Mémoriser le dernier ID de commande connu pour ne pas déclencher d'alerte au rechargement
  const lastKnownOrderIdRef = useRef<string | null>(null);
  const isFirstSyncRef = useRef<boolean>(true);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Charger les préférences de son au montage
  useEffect(() => {
    setSoundEnabled(getSoundPreference());

    // Déverrouiller l'AudioContext dès le premier clic/toucher sur l'écran
    const handleFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction, { passive: true });
    window.addEventListener("touchstart", handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // Déclencher l'alerte sonore, visuelle et la vibration
  const triggerOrderAlert = useCallback(
    (order: LiveOrderPayload) => {
      // 1. Jouer le carillon sonore
      if (getSoundPreference()) {
        playNewOrderSound();
      }

      // 2. Vibreur mobile iPhone / Android si supporté
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {}
      }

      // 3. Notification système si l'onglet est en arrière-plan
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const modeLabel = order.mode === "delivery" ? "Livraison" : "Expédition";
          new Notification(`🛍️ Nouvelle commande ! [${order.number}]`, {
            body: `${order.customerName} • ${formatMoney(order.total, order.currency)} (${modeLabel})`,
            icon: "/icons/icon-192.png",
            tag: `order-${order.id}`,
          });
        } catch {}
      }

      // 4. Afficher la bannière flottante à l'écran
      setActiveAlert(order);

      // 5. Rafraîchir les données des pages courantes sans rechargement lourd
      router.refresh();

      // 6. Émettre un événement global pour mettre à jour les badges
      window.dispatchEvent(new CustomEvent("boutique:new_order", { detail: order }));
    },
    [router]
  );

  // Synchronisation continue (Polling intelligent + BroadcastChannel multi-onglets)
  useEffect(() => {
    let isMounted = true;

    // Canal BroadcastChannel pour synchronisation immédiate (0ms) entre les onglets
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel("boutique_realtime");
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (event.data?.type === "new_order" && event.data.order) {
            const incoming = event.data.order as LiveOrderPayload;
            if (incoming.id !== lastKnownOrderIdRef.current) {
              lastKnownOrderIdRef.current = incoming.id;
              triggerOrderAlert(incoming);
            }
          } else if (event.data?.type === "stock_updated") {
            router.refresh();
          }
        };
      } catch {}
    }

    // Fonction de synchronisation avec l'API serveur
    async function syncAdminData() {
      if (!isMounted) return;

      try {
        const res = await fetch("/api/sync/admin", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) {
          setConnected(false);
          return;
        }

        setConnected(true);
        const data = await res.json();

        if (data.success && data.latestOrder) {
          const currentOrder: LiveOrderPayload = data.latestOrder;

          // Au premier démarrage du composant : enregistrer l'ID sans sonner pour les commandes passées
          if (isFirstSyncRef.current) {
            lastKnownOrderIdRef.current = currentOrder.id;
            isFirstSyncRef.current = false;
          } else if (currentOrder.id !== lastKnownOrderIdRef.current) {
            // Une nouvelle commande vient d'arriver !
            lastKnownOrderIdRef.current = currentOrder.id;
            triggerOrderAlert(currentOrder);
          }

          // Émettre les nouveaux compteurs de badge
          window.dispatchEvent(
            new CustomEvent("boutique:sync_counts", {
              detail: {
                newOrdersCount: data.newOrdersCount,
                unreadNotificationsCount: data.unreadNotificationsCount,
              },
            })
          );
        }
      } catch {
        setConnected(false);
      }
    }

    // Exécuter immédiatement
    syncAdminData();

    // Intervalle dynamique selon que l'onglet est actif ou en arrière-plan
    let intervalId: NodeJS.Timeout;

    const setupInterval = () => {
      clearInterval(intervalId);
      const isVisible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
      // 3.5 secondes si l'onglet est affiché, 15 secondes si en arrière-plan (économie batterie/data)
      const delay = isVisible ? 3500 : 15000;
      intervalId = setInterval(syncAdminData, delay);
    };

    setupInterval();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncAdminData();
      }
      setupInterval();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [triggerOrderAlert, router]);

  // Fermeture automatique de l'alerte flottante après 12 secondes
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundPreference(next);
    if (next) {
      playNotificationSound();
    }
  };

  return (
    <>
      {/* BANNIÈRE FLOTTANTE DE NOUVELLE COMMANDE (Notification Temps Réel iOS Style) */}
      {activeAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="bg-black text-white p-4 rounded-2xl shadow-2xl border border-gray-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg flex-shrink-0 animate-bounce">
                  🛍️
                </span>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 block">
                    Nouvelle commande reçue !
                  </span>
                  <span className="text-sm font-black tracking-tight">{activeAlert.number}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="w-7 h-7 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-base font-bold transition-colors"
                title="Fermer"
              >
                &times;
              </button>
            </div>

            <div className="bg-gray-900/90 rounded-xl p-3 space-y-1 text-xs border border-gray-800">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-gray-300">{activeAlert.customerName}</span>
                <span className="text-emerald-400 font-black">
                  {formatMoney(activeAlert.total, activeAlert.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>{activeAlert.customerPhone}</span>
                <span className="capitalize">
                  {activeAlert.mode === "delivery"
                    ? `🛵 ${activeAlert.commune || "Livraison"}`
                    : `📦 ${activeAlert.city || "Expédition"}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/admin/orders/${activeAlert.id}`}
                onClick={() => setActiveAlert(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs text-center transition-all active:scale-98 shadow-md"
              >
                Ouvrir la commande &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition-colors"
              >
                Masquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOUTON FLOTTANT DISCRET : CONTRÔLE DU SON & STATUT TEMPS RÉEL */}
      <aside aria-label="Contrôles du direct" className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSound}
          title={soundEnabled ? "Alertes sonores actives (cliquer pour couper)" : "Alertes sonores coupées (cliquer pour activer)"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border backdrop-blur-md transition-all active:scale-95 ${
            soundEnabled
              ? "bg-white/95 text-gray-800 border-gray-200 hover:bg-white"
              : "bg-gray-800/90 text-gray-400 border-gray-700 hover:bg-gray-800"
          }`}
        >
          <span>{soundEnabled ? "🔔 Son actif" : "🔕 Silencieux"}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
            title={connected ? "Synchronisation temps réel connectée" : "Reconnexion..."}
          />
        </button>
      </aside>
    </>
  );
}
