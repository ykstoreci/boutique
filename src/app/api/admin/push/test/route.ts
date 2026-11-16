import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { sendAdminNotification } from "@/lib/push";

export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const notifId = await sendAdminNotification("test", {
    title: "🔔 Test de notification Push réussi !",
    body: "Votre iPhone est correctement configuré pour recevoir les nouvelles commandes en temps réel.",
    url: "/admin/orders",
    tag: "test-notification",
  });

  return NextResponse.json({
    success: true,
    notificationId: notifId,
    message: "Notification de test envoyée.",
  });
}

