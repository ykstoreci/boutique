import { NextRequest, NextResponse } from "next/server";
import { createOrder, createOrderSchema } from "@/lib/orders";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();

    const parseResult = createOrderSchema.safeParse(json);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Données de commande invalides.";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;

    const result = await createOrder(parseResult.data, ip);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Erreur API création commande :", err);
    return NextResponse.json(
      { success: false, error: "Une erreur est survenue lors de l'enregistrement de votre commande." },
      { status: 500 }
    );
  }
}

