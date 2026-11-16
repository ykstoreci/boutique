import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { themeVersions } from "@/db/schema";
import { getDraftTheme } from "@/lib/theme/render";
import { cachedQuery } from "@/lib/cache";
import { AdminThemeEditor } from "@/components/admin/AdminThemeEditor";
import { eq, desc } from "drizzle-orm";

export default async function AdminThemePage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const { draft, versions } = await cachedQuery("admin:theme:editor", 30_000, async () => {
    const db = await getDb();
    const draftTheme = await getDraftTheme();
    const ver = await db
      .select()
      .from(themeVersions)
      .where(eq(themeVersions.themeId, draftTheme.themeId))
      .orderBy(desc(themeVersions.version));
    return { draft: draftTheme, versions: ver };
  });

  return (
    <AdminThemeEditor
      themeId={draft.themeId}
      initialSettings={draft.snapshot.settings}
      initialSections={draft.snapshot.sections}
      initialVersions={versions}
    />
  );
}

