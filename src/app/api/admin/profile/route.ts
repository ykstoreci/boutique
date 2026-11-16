import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, verifyPassword, hashPassword, logAudit } from "@/lib/auth";
import { getDb } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  const current = await getCurrentAdmin();
  if (!current) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const currentUser = current.user;

  try {
    const body = await req.json();
    const { name, email, currentPassword, newPassword } = body;

    const db = await getDb();

    // Vérifier l'unicité de l'email s'il est changé
    if (email && email.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
      const existing = await db
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(and(eq(adminUsers.email, email.trim().toLowerCase()), ne(adminUsers.id, currentUser.id)))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Cette adresse email est déjà utilisée par un autre compte." },
          { status: 400 }
        );
      }
    }

    const updates: Partial<{
      name: string;
      email: string;
      passwordHash: string;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (name && typeof name === "string") {
      updates.name = name.trim();
    }

    if (email && typeof email === "string" && email.includes("@")) {
      updates.email = email.trim().toLowerCase();
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Le mot de passe actuel est requis pour définir un nouveau mot de passe." },
          { status: 400 }
        );
      }

      const [userRecord] = await db
        .select({ passwordHash: adminUsers.passwordHash })
        .from(adminUsers)
        .where(eq(adminUsers.id, currentUser.id))
        .limit(1);

      if (!userRecord) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
      }

      const isCurrentValid = await verifyPassword(currentPassword, userRecord.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Le mot de passe actuel est incorrect." },
          { status: 400 }
        );
      }

      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return NextResponse.json(
          { error: "Le nouveau mot de passe doit comporter au moins 8 caractères." },
          { status: 400 }
        );
      }

      updates.passwordHash = await hashPassword(newPassword);
    }

    await db.update(adminUsers).set(updates).where(eq(adminUsers.id, currentUser.id));

    // Audit log
    await logAudit(
      currentUser.id,
      "ADMIN_PROFILE_UPDATE",
      "admin_users",
      currentUser.id,
      {
        emailChanged: !!updates.email,
        passwordChanged: !!updates.passwordHash,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Profil administrateur mis à jour avec succès.",
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil :", error);
    return NextResponse.json(
      { error: "Erreur interne lors de la mise à jour du compte." },
      { status: 500 }
    );
  }
}


