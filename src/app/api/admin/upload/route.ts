import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { processAndSaveImage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("images") as File[];
    const prefix = (formData.get("prefix") as string) || "products";

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun fichier reçu." }, { status: 400 });
    }

    const uploaded = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const processed = await processAndSaveImage(buffer, prefix);
      uploaded.push(processed);
    }

    return NextResponse.json({ success: true, images: uploaded });
  } catch (err) {
    console.error("Erreur upload image :", err);
    return NextResponse.json({ success: false, error: "Échec du traitement des images." }, { status: 500 });
  }
}

