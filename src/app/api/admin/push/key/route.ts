import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  return NextResponse.json({ publicKey });
}

