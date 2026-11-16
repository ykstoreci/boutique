import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const publicKey = getVapidPublicKey();
  return NextResponse.json({ publicKey });
}

