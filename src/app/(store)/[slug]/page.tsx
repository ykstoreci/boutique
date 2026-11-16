import { getDb } from "@/db";
import { pages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function GenericPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.isPublished, true)))
    .limit(1);

  if (!page) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">
        {page.title}
      </h1>

      {page.content && page.content.trim() !== "" ? (
        <div className="prose prose-sm sm:prose max-w-none text-sm sm:text-base leading-relaxed text-[var(--theme-text)] opacity-90 whitespace-pre-line">
          {page.content}
        </div>
      ) : (
        <div className="p-6 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border)] text-center text-xs text-[var(--theme-muted)]">
          Le contenu de cette page est en cours de rédaction par le propriétaire.
        </div>
      )}
    </div>
  );
}

