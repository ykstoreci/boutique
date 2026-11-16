import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { invalidateCache } from "@/lib/cache";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const db = await getDb();

    if (body.action === "mark_all_read") {
      await db.update(notifications).set({ isRead: true });
      invalidateCache("admin:notifications");
      invalidateCache("admin:badges");
      return NextResponse.json({ success: true });
    }

    if (body.notificationId) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, body.notificationId));
      invalidateCache("admin:notifications");
      invalidateCache("admin:badges");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Action inconnue." }, { status: 400 });
  } catch (err) {
    console.error("Erreur notifications :", err);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

