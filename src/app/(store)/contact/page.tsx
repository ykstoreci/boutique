import { getDb } from "@/db";
import { storeSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  let settings: any = null;

  try {
    const db = await getDb();
    const [s] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
    settings = s || null;
  } catch (err) {
    console.warn("ContactPage: BDD en cours d'initialisation :", err);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Contactez-nous</h1>
        <p className="text-xs sm:text-sm text-[var(--theme-muted)] mt-2">
          Une question ou besoin d&apos;assistance ? Notre équipe est à votre disposition.
        </p>
      </div>

      <div className="rounded-[var(--theme-radius-card)] bg-[var(--theme-surface)] border border-[var(--theme-border)] p-6 space-y-6 shadow-xs">
        {settings?.whatsappNumber ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold">WhatsApp</h2>
              <p className="text-xs text-[var(--theme-muted)] mb-2">Service client & commandes</p>
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:underline"
              >
                Discuter sur WhatsApp &rarr;
              </a>
            </div>
          </div>
        ) : null}

        {settings?.phone ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold">Téléphone</h2>
              <p className="text-xs text-[var(--theme-muted)] mb-1">Appel direct</p>
              <a href={`tel:${settings.phone}`} className="text-xs font-semibold hover:underline">
                {settings.phone}
              </a>
            </div>
          </div>
        ) : null}

        {settings?.email ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold">Email</h2>
              <p className="text-xs text-[var(--theme-muted)] mb-1">Pour toute demande formelle</p>
              <a href={`mailto:${settings.email}`} className="text-xs font-semibold hover:underline">
                {settings.email}
              </a>
            </div>
          </div>
        ) : null}

        {settings?.address ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold">Adresse</h2>
              <p className="text-xs text-[var(--theme-muted)]">{settings.address}</p>
            </div>
          </div>
        ) : null}

        {!settings?.phone && !settings?.whatsappNumber && !settings?.email && !settings?.address && (
          <p className="text-xs text-[var(--theme-muted)] text-center py-4">
            Les coordonnées de contact sont en cours de configuration par le propriétaire.
          </p>
        )}
      </div>
    </div>
  );
}
