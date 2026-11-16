"use client";

import { useState } from "react";
import Link from "next/link";

export function AdminNotificationsView({
  notifications: initialNotifications,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notifications: any[];
}) {
  const [notifs, setNotifs] = useState(initialNotifications);

  async function handleMarkAllRead() {
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });

    if (res.ok) {
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  async function handleMarkSingleRead(id: string) {
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });

    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Centre de Notifications</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Historique des alertes de commandes et de stock
          </p>
        </div>

        {notifs.some((n) => !n.isRead) && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold hover:bg-gray-50 self-start"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs divide-y divide-gray-100 overflow-hidden">
        {notifs.length > 0 ? (
          notifs.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !n.isRead ? "bg-amber-50/40" : "hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {n.type === "new_order"
                    ? "🛍️"
                    : n.type === "low_stock" || n.type === "out_of_stock"
                    ? "⚠️"
                    : n.type === "order_cancelled"
                    ? "❌"
                    : "🔔"}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900">{n.title}</span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.body}</p>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    {new Date(n.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {n.url && (
                  <Link
                    href={n.url}
                    onClick={() => handleMarkSingleRead(n.id)}
                    className="px-2.5 py-1 rounded-lg bg-black text-white text-[11px] font-semibold hover:bg-gray-800"
                  >
                    Voir
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkSingleRead(n.id)}
                    className="p-1 text-gray-400 hover:text-black text-xs font-semibold"
                    title="Marquer comme lu"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-xs text-gray-400">
            Aucune notification pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}

