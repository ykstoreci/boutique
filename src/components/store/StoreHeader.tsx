"use client";

import { useState } from "react";
import Link from "next/link";
import { type ThemeSettings } from "@/lib/theme/schema";
import { getImageUrl } from "@/lib/images";

export function StoreHeader({
  storeName,
  logoKey,
  settings,
  categories,
}: {
  storeName: string;
  logoKey: string | null | undefined;
  settings: ThemeSettings;
  categories: { id: string; name: string; slug: string }[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const h = settings.header;
  const logoUrl = getImageUrl(logoKey, "medium");

  return (
    <header className={`${h.sticky ? "sticky top-0 z-40" : "relative"} w-full border-b transition-colors`}
      style={{
        backgroundColor: h.background || "var(--theme-background)",
        color: h.textColor || "var(--theme-text)",
        borderColor: "var(--theme-border)",
      }}
    >
      {/* Barre d'annonce facultative */}
      {h.announcement && h.announcement.trim() !== "" && (
        <div
          className="py-1.5 px-4 text-center text-xs font-medium tracking-wide"
          style={{
            backgroundColor: h.announcementBackground || "var(--theme-primary)",
            color: h.announcementTextColor || "var(--theme-primary-text)",
          }}
        >
          {h.announcement}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Menu Hamburger MOBILE (Règle stricte : aucune barre ni icône de recherche sur mobile) */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 -ml-2 rounded-lg text-current hover:opacity-75 focus:outline-none"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Logo / Nom de la boutique */}
        <div className={`flex items-center ${h.layout === "center" ? "justify-center flex-1 md:flex-none" : ""}`}>
          <Link href="/" className="flex items-center gap-2 group">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={storeName || "Logo"}
                style={{ height: `${h.logoHeight}px` }}
                className="w-auto object-contain"
              />
            ) : null}
            {(!logoUrl || h.showStoreName) && (
              <span className="font-bold text-lg tracking-tight group-hover:opacity-85 transition-opacity">
                {storeName || "Ma Boutique"}
              </span>
            )}
          </Link>
        </div>

        {/* Navigation Bureau */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/" prefetch={true} className="hover:opacity-75 transition-opacity">
            Accueil
          </Link>
          <Link href="/catalogue" prefetch={true} className="hover:opacity-75 transition-opacity">
            Catalogue
          </Link>
          {categories.length > 0 && (
            <div className="relative group py-2">
              <Link href="/categories" prefetch={true} className="hover:opacity-75 transition-opacity flex items-center gap-1">
                Catégories
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              <div className="absolute top-full left-0 hidden group-hover:block w-48 py-2 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/categories/${c.slug}`}
                    prefetch={true}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {settings.menu.links.map((link: { label: string; href: string }, idx: number) => (
            <Link key={idx} href={link.href} prefetch={true} className="hover:opacity-75 transition-opacity">
              {link.label}
            </Link>
          ))}
          <Link href="/contact" prefetch={true} className="hover:opacity-75 transition-opacity">
            Contact
          </Link>
        </nav>

        {/* Côté droit : Espace réservé / recherche uniquement sur grand écran (md et plus) */}
        <div className="hidden md:flex items-center gap-4">
          <form action="/catalogue" method="GET" className="relative">
            <input
              type="text"
              name="q"
              placeholder="Rechercher..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-full border border-gray-300 focus:outline-none focus:border-black w-40 focus:w-56 transition-all"
            />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
        </div>

        {/* Espace vide mobile pour équilibrer le header */}
        <div className="w-8 md:hidden" />
      </div>

      {/* TIROIR MOBILE (Navigation mobile claire, sans champ de recherche) */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 pt-3 pb-6 space-y-3 bg-inherit" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex flex-col space-y-2 text-base font-medium">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-black/5"
            >
              Accueil
            </Link>
            <Link
              href="/catalogue"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-black/5"
            >
              Tous les produits
            </Link>

            {categories.length > 0 && (
              <div className="pt-2">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Catégories
                </span>
                <div className="pl-2 space-y-1">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/categories/${c.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-1.5 text-sm rounded-lg hover:bg-black/5"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {settings.menu.links.map((link: { label: string; href: string }, idx: number) => (
              <Link
                key={idx}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-black/5"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-black/5"
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
