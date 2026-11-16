import Link from "next/link";
import { type SocialLinks } from "@/db/schema";
import { type ThemeSettings } from "@/lib/theme/schema";

export function StoreFooter({
  storeName,
  settings,
  socialLinks,
  systemPages,
}: {
  storeName: string;
  settings: ThemeSettings;
  socialLinks: SocialLinks;
  systemPages: { slug: string; title: string }[];
}) {
  const f = settings.footer;
  const currentYear = new Date().getFullYear();

  const activeSocials = Object.entries(socialLinks || {}).filter(
    ([, url]) => typeof url === "string" && url.trim().length > 0
  );

  return (
    <footer
      className="border-t mt-auto text-sm transition-colors"
      style={{
        backgroundColor: f.background || "var(--theme-surface)",
        color: f.textColor || "var(--theme-text)",
        borderColor: "var(--theme-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Colonne 1 : Nom et présentation */}
          <div className="space-y-3">
            <span className="font-bold text-lg tracking-tight block">
              {storeName || "Ma Boutique"}
            </span>
            {f.text && f.text.trim() !== "" ? (
              <p className="text-sm opacity-80 leading-relaxed whitespace-pre-line">
                {f.text}
              </p>
            ) : null}
          </div>

          {/* Colonne 2 : Liens utiles & Informations légales */}
          {f.showPages && (
            <div className="space-y-3">
              <span className="font-semibold text-xs uppercase tracking-wider block opacity-70">
                Informations légales
              </span>
              <ul className="space-y-2 text-sm">
                {systemPages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/${page.slug}`}
                      className="hover:opacity-75 transition-opacity"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Colonne 3 : Réseaux sociaux & Contact */}
          <div className="space-y-3">
            {f.showSocial && activeSocials.length > 0 && (
              <div>
                <span className="font-semibold text-xs uppercase tracking-wider block opacity-70 mb-2">
                  Suivez-nous
                </span>
                <div className="flex flex-wrap gap-3">
                  {activeSocials.map(([network, url]) => (
                    <a
                      key={network}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-current/20 hover:bg-black/5 capitalize transition-all"
                    >
                      {network}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {f.showContact && (
              <div className="pt-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center text-sm font-medium hover:opacity-75"
                >
                  Besoin d&apos;aide ? Contactez-nous &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between text-xs opacity-60 gap-4">
          <p>&copy; {currentYear} {storeName || "Boutique"}. Tous droits réservés.</p>
          <p>Plateforme e-commerce professionnelle</p>
        </div>
      </div>
    </footer>
  );
}
