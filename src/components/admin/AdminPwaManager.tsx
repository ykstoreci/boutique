"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function AdminPwaManager() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      setPermission(Notification.permission);

      // Enregistrer le Service Worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub) {
            setSubscribed(true);
          }
        })
        .catch((err) => {
          console.error("Échec d'enregistrement Service Worker :", err);
        });
    }
  }, []);

  async function handleEnablePush() {
    setLoading(true);
    setMessage(null);

    try {
      // 1. Demander la permission à l'utilisateur
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setMessage("Notifications refusées dans les réglages de votre appareil.");
        setLoading(false);
        return;
      }

      // 2. Récupérer la clé publique VAPID depuis le serveur
      const keyRes = await fetch("/api/admin/push/key");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) {
        setMessage("Clé VAPID non configurée sur le serveur.");
        setLoading(false);
        return;
      }

      // 3. S'abonner via le PushManager
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });
      }

      // 4. Envoyer l'abonnement au backend
      const rawSub = sub.toJSON();
      const saveRes = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: rawSub.endpoint,
          keys: rawSub.keys,
          deviceLabel: navigator.userAgent.includes("iPhone") ? "iPhone" : "Navigateur",
        }),
      });

      if (saveRes.ok) {
        setSubscribed(true);
        setMessage("✓ Notifications push iPhone activées avec succès !");
      } else {
        setMessage("Erreur lors de l'enregistrement de l'abonnement sur le serveur.");
      }
    } catch (err) {
      console.error("Erreur activation push :", err);
      setMessage("Impossible d'activer les notifications push.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTest() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/push/test", { method: "POST" });
      if (res.ok) {
        setMessage("Notification de test envoyée ! Regardez l'écran de votre appareil.");
      } else {
        setMessage("Erreur d'envoi du test.");
      }
    } catch {
      setMessage("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  // Si déjà abonné, n'afficher qu'un indicateur discret ou rien
  if (subscribed) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Notifications Push iPhone actives</span>
        </div>
        <button
          type="button"
          onClick={handleSendTest}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 active:scale-95 transition-all"
        >
          Tester
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold block text-sm">Recevoir les commandes sur iPhone</span>
          <p className="opacity-80 mt-0.5">
            Activez les notifications push réelles pour être alerté instantanément de chaque nouvelle commande.
          </p>
        </div>
        <button
          type="button"
          onClick={handleEnablePush}
          disabled={loading}
          className="ml-3 px-3 py-1.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 active:scale-95 transition-all flex-shrink-0"
        >
          {loading ? "Activation..." : "Activer"}
        </button>
      </div>
      {message && <div className="font-semibold pt-1 text-black">{message}</div>}
    </div>
  );
}

