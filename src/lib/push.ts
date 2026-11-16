import webpush from "web-push";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import {
  notifications,
  pushSubscriptions,
  pushDeliveries,
  type NotificationType,
} from "@/db/schema";

let isVapidConfigured = false;

const globalForVapid = globalThis as unknown as {
  __boutiqueVapidKeys?: { publicKey: string; privateKey: string };
};

export function getVapidKeys(): { publicKey: string; privateKey: string } {
  let publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  let privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }

  if (globalForVapid.__boutiqueVapidKeys) {
    return globalForVapid.__boutiqueVapidKeys;
  }

  // Génération automatique d'un jeu de clés VAPID en mémoire pour fonctionnement immédiat
  const generated = webpush.generateVAPIDKeys();
  globalForVapid.__boutiqueVapidKeys = generated;
  return generated;
}

export function getVapidPublicKey(): string {
  return getVapidKeys().publicKey;
}

function ensureVapidConfigured(): boolean {
  if (isVapidConfigured) return true;

  const { publicKey, privateKey } = getVapidKeys();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@boutique.local";

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      isVapidConfigured = true;
      return true;
    } catch (err) {
      console.warn("Échec configuration VAPID :", err);
      return false;
    }
  }
  return false;
}

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  orderId?: string;
  productId?: string;
};

/**
 * Crée une notification dans le centre de notifications interne
 * et l'envoie en Push à tous les abonnements actifs de l'administrateur.
 * Cette fonction est asynchrone et sécurisée : une erreur push ne fait jamais échouer l'appelant.
 */
export async function sendAdminNotification(
  type: NotificationType,
  data: PushNotificationPayload
): Promise<string | null> {
  try {
    const db = await getDb();

    // 1. Enregistrement dans le centre de notifications interne
    const [notif] = await db
      .insert(notifications)
      .values({
        type,
        title: data.title,
        body: data.body,
        url: data.url || "/admin/orders",
        orderId: data.orderId || null,
        productId: data.productId || null,
        pushStatus: "pending",
      })
      .returning({ id: notifications.id });

    // 2. Vérification de la configuration VAPID
    const canPush = ensureVapidConfigured();
    if (!canPush) {
      await db
        .update(notifications)
        .set({ pushStatus: "disabled" })
        .where(eq(notifications.id, notif.id));
      return notif.id;
    }

    // 3. Récupérer les abonnements actifs
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.isActive, true));

    if (subs.length === 0) {
      await db
        .update(notifications)
        .set({ pushStatus: "no_subscription" })
        .where(eq(notifications.id, notif.id));
      return notif.id;
    }

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url || "/admin/orders",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      tag: data.tag || type,
      timestamp: Date.now(),
      data: {
        orderId: data.orderId,
        url: data.url || "/admin/orders",
      },
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of subs) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        const res = await webpush.sendNotification(pushConfig, payload, {
          TTL: 86400, // 24h
          urgency: "high",
        });

        successCount++;

        await db.insert(pushDeliveries).values({
          notificationId: notif.id,
          subscriptionId: sub.id,
          success: true,
          statusCode: res.statusCode,
        });

        await db
          .update(pushSubscriptions)
          .set({
            lastSuccessAt: new Date(),
            failureCount: 0,
            lastError: null,
          })
          .where(eq(pushSubscriptions.id, sub.id));
      } catch (err: unknown) {
        failCount++;
        const error = err as { statusCode?: number; message?: string };
        const statusCode = error.statusCode;

        await db.insert(pushDeliveries).values({
          notificationId: notif.id,
          subscriptionId: sub.id,
          success: false,
          statusCode: statusCode || null,
          error: String(error.message || err),
        });

        // Désactiver l'abonnement si expiré ou invalide (404 / 410)
        const isExpired = statusCode === 404 || statusCode === 410;
        await db
          .update(pushSubscriptions)
          .set({
            isActive: !isExpired,
            failureCount: sub.failureCount + 1,
            lastError: String(error.message || err).slice(0, 500),
          })
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }

    const finalStatus =
      successCount > 0 && failCount === 0
        ? "sent"
        : successCount > 0
        ? "partial"
        : "failed";

    await db
      .update(notifications)
      .set({ pushStatus: finalStatus })
      .where(eq(notifications.id, notif.id));

    return notif.id;
  } catch (globalErr) {
    console.error("Erreur lors de l'envoi de la notification push :", globalErr);
    return null;
  }
}

