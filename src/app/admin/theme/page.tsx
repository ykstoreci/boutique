import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { themes, themeSections, themeVersions } from "@/db/schema";
import { getDraftTheme } from "@/lib/theme/render";
import { AdminThemeEditor } from "@/components/admin/AdminThemeEditor";
import { eq, desc } from "drizzle-orm";

export default async function AdminThemePage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const db = await getDb();
  const draft = await getDraftTheme();

  const versions = await db
    .select()
    .from(themeVersions)
    .where(eq(themeVersions.themeId, draft.themeId))
    .orderBy(desc(themeVersions.version));

  return (
    <AdminThemeEditor
      themeId={draft.themeId}
      initialSettings={draft.snapshot.settings}
      initialSections={draft.snapshot.sections}
      initialVersions={versions}
    />
  );
}

