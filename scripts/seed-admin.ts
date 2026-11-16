import bcrypt from "bcryptjs";
import { createDatabase } from "../src/db/client";
import { adminUsers, loginAttempts } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== CRÉATION/VÉRIFICATION DU COMPTE PROPRIÉTAIRE ===");
  const db = await createDatabase(process.env.DATABASE_URL);

  const email = "admin@boutique.local";
  const password = "Admin1234!*";
  const name = "Propriétaire";

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(adminUsers)
      .set({
        name,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existing[0].id));
    console.log("Compte mis à jour avec succès !");
  } else {
    await db.insert(adminUsers).values({
      email,
      name,
      passwordHash,
    });
    console.log("Compte créé avec succès !");
  }

  // Vider les tentatives de connexion échouées
  await db.delete(loginAttempts);

  // Vérifier la correspondance immédiate
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  const match = await bcrypt.compare(password, user.passwordHash);
  console.log("Vérification bcrypt du mot de passe :", {
    email: user.email,
    passwordMatch: match,
  });

  if (db.$close) {
    await db.$close();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});

