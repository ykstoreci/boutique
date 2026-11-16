"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function AdminNavigation({
  unreadNotifications = 0,
  newOrdersCount = 0,
  adminName = "Propriétaire",
  isProduction = false,
}: {
  unreadNotifications?: number;
  newOrdersCount?: number;
  adminName?: string;
  isProduction?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadNotifications);
  const [liveNewOrdersCount, setLiveNewOrdersCount] = useState(newOrdersCount);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Réinitialiser la navigation dès que la page a changé
  useEffect(() => {
    setIsNavigating(false);
    setTargetHref(null);
  }, [pathname]);

  // Pré-chargement intelligent des sections clés en mémoire (1ms au clic)
  useEffect(() => {
    const timer = setTimeout(() => {
      router.prefetch("/admin");
      router.prefetch("/admin/orders");
      router.prefetch("/admin/stock");
      router.prefetch("/admin/products");
      router.prefetch("/admin/theme");
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  // Mettre à jour les compteurs en temps réel dès réception d'événements
  useEffect(() => {
    setLiveUnreadCount(unreadNotifications);
  }, [unreadNotifications]);

  useEffect(() => {
    setLiveNewOrdersCount(newOrdersCount);
  }, [newOrdersCount]);

  useEffect(() => {
    const handleSyncCounts = (event: Event) => {
      const customEvent = event as CustomEvent<{
        newOrdersCount: number;
        unreadNotificationsCount: number;
      }>;
      if (customEvent.detail) {
        setLiveNewOrdersCount(customEvent.detail.newOrdersCount);
        setLiveUnreadCount(customEvent.detail.unreadNotificationsCount);
      }
    };

    window.addEventListener("boutique:sync_counts", handleSyncCounts);
    return () => {
      window.removeEventListener("boutique:sync_counts", handleSyncCounts);
    };
  }, []);

  // Si on est sur la page de connexion ou d'initialisation, ne pas afficher la navigation
  if (pathname === "/admin/login" || pathname === "/admin/setup") {
    return null;
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = isProduction ? "/admin/login" : "/admin";
  }

  const handleLinkClick = (href: string) => {
    if (href !== pathname) {
      setTargetHref(href);
      setIsNavigating(true);
    }
  };

  const navItems = [
    { href: "/admin", label: "Tableau de bord", icon: "📊" },
    { href: "/admin/orders", label: "Commandes", icon: "🛍️", badge: liveNewOrdersCount },
    { href: "/admin/products", label: "Produits", icon: "📦" },
    { href: "/admin/categories", label: "Catégories", icon: "🏷️" },
    { href: "/admin/customers", label: "Clients", icon: "👥" },
    { href: "/admin/stock", label: "Stocks", icon: "📈" },
    { href: "/admin/shipping", label: "Livraison & Expédition", icon: "🛵" },
    { href: "/admin/theme", label: "Personnalisation", icon: "🎨" },
    { href: "/admin/pages", label: "Gestion des pages", icon: "📄" },
    { href: "/admin/notifications", label: "Notifications", icon: "🔔", badge: liveUnreadCount },
    { href: "/admin/settings", label: "Paramètres", icon: "⚙️" },
  ];



  return (
    <>
      {/* Micro-indicateur ultra-fin de transition instantanée */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-black z-50 animate-pulse" />
      )}

      {/* BARRE SUPÉRIEURE (Bureau & Mobile) */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            onMouseEnter={() => router.prefetch("/admin")}
            onTouchStart={() => router.prefetch("/admin")}
            onClick={() => handleLinkClick("/admin")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Accueil Administration"
            aria-label="Accueil Administration"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/brand-b.png"
              alt="Logo"
              width={27}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            target="_blank"
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1"
          >
            <span>Voir la boutique</span>
            <span className="text-xs">↗</span>
          </Link>

          <Link
            href="/admin/notifications"
            onMouseEnter={() => router.prefetch("/admin/notifications")}
            onTouchStart={() => router.prefetch("/admin/notifications")}
            onClick={() => handleLinkClick("/admin/notifications")}
            className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Notifications"
          >
            <span className="text-base">🔔</span>
            {liveUnreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {liveUnreadCount > 9 ? "9+" : liveUnreadCount}
              </span>
            )}
          </Link>

          {isProduction ? (
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-xs text-red-600 font-medium hover:bg-red-50 rounded-lg hidden sm:block"
            >
              Déconnexion
            </button>
          ) : (
            <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold hidden sm:inline-block">
              Accès local direct
            </span>
          )}
        </div>
      </header>

      {/* SIDEBAR BUREAU (md et supérieur) */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-50 border-r border-gray-200 fixed top-14 bottom-0 left-0 overflow-y-auto p-4 z-20">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
          Gestion Commerciale
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const currentSelected = targetHref !== null ? targetHref : pathname;
            const isActive = currentSelected === item.href || (item.href !== "/admin" && currentSelected.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => router.prefetch(item.href)}
                onTouchStart={() => router.prefetch(item.href)}
                onClick={() => handleLinkClick(item.href)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-black text-white shadow-xs"
                    : "text-gray-700 hover:bg-gray-200/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-red-500 text-white" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-gray-200 mt-4 px-3 flex items-center justify-between">
          <div className="truncate">
            <span className="block text-xs font-bold text-gray-900 truncate">{adminName}</span>
            <span className="block text-[11px] text-gray-500">Propriétaire</span>
          </div>
          <Link
            href="/"
            target="_blank"
            title="Voir la boutique en ligne"
            className="text-xs text-gray-600 hover:text-black font-medium"
          >
            Boutique ↗
          </Link>
        </div>
      </aside>

      {/* BARRE D'ONGLETS BAS MOBILE (Style Application iPhone / PWA) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around h-16 pb-safe px-2">
        {[
          { href: "/admin", label: "Accueil", icon: "📊" },
          { href: "/admin/orders", label: "Commandes", icon: "🛍️", badge: liveNewOrdersCount },
          { href: "/admin/products", label: "Produits", icon: "📦" },
          { href: "/admin/theme", label: "Thème", icon: "🎨" },
        ].map((tab) => {
          const currentSelected = targetHref !== null ? targetHref : pathname;
          const isActive = currentSelected === tab.href || (tab.href !== "/admin" && currentSelected.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onMouseEnter={() => router.prefetch(tab.href)}
              onTouchStart={() => router.prefetch(tab.href)}
              onClick={() => handleLinkClick(tab.href)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors ${
                isActive ? "text-black font-bold" : "text-gray-500"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-0 right-3 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium text-gray-500"
        >
          <span className="text-lg">☰</span>
          <span>Plus</span>
        </button>
      </nav>

      {/* MENU TIROIR MOBILE COMPLET (Pour accéder à tous les autres modules sur iPhone) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-bold text-base">Tous les modules</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {navItems.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onMouseEnter={() => router.prefetch(it.href)}
                  onTouchStart={() => router.prefetch(it.href)}
                  onClick={() => {
                    handleLinkClick(it.href);
                    setMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2 font-semibold hover:bg-gray-100"
                >
                  <span className="text-base">{it.icon}</span>
                  <span className="truncate">{it.label}</span>
                </Link>
              ))}
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <span className="text-xs text-gray-500">{adminName}</span>
              <Link
                href="/"
                target="_blank"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200"
              >
                Voir boutique ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

