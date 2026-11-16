import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logAudit } from "@/lib/auth";
import { getDb } from "@/db";
import { pages } from "@/db/schema";
import { invalidateCache } from "@/lib/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updatePageSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(150),
  content: z.string().default(""),
  isPublished: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
});

export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const parsed = updatePageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Données invalides." }, { status: 400 });
    }

    const { id, title, content, isPublished, showInFooter } = parsed.data;
    const db = await getDb();

    await db
      .update(pages)
      .set({
        title: title.trim(),
        content: content.trim(),
        isPublished,
        showInFooter,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id));

    invalidateCache("admin:pages");
    invalidateCache("store:footerPages");
    await logAudit(admin.user.id, "update_page", "pages", id, { title });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur mise à jour page :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

