import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentAdmin, logAudit } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ success: true, redirect: "/admin" });
  }

  try {
    const admin = await getCurrentAdmin();
    if (admin) {
      await logAudit(admin.user.id, "logout", "admin_users", admin.user.id);
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true, redirect: "/admin/login" });
  } catch {
    await clearSessionCookie();
    return NextResponse.json({ success: true, redirect: "/admin/login" });
  }
}
