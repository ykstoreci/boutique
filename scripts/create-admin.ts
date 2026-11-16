import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import { createDatabase } from "../src/db/client";
import { adminUsers } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log("=== CRÉATION DU COMPTE PROPRIÉTAIRE INITIAL ===");

  const emailInput = process.env.INITIAL_ADMIN_EMAIL || (await rl.question("Email du propriétaire : "));
  const email = emailInput.trim().toLowerCase();

  const nameInput = process.env.INITIAL_ADMIN_NAME || (await rl.question("Nom du propriétaire : "));
  const name = nameInput.trim();

  const passwordInput = process.env.INITIAL_ADMIN_PASSWORD || (await rl.question("Mot de passe (min 8 caractères) : "));
  const password = passwordInput.trim();

  rl.close();

  if (!email || !password || password.length < 8) {
    console.error("Erreur : Email et mot de passe (min 8 car.) requis.");
    process.exit(1);
  }

  const db = await createDatabase(process.env.DATABASE_URL);

  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing.length > 0) {
    await db
      .update(adminUsers)
      .set({
        name,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existing[0].id));
    console.log(`Compte propriétaire [${email}] mis à jour avec succès.`);
  } else {
    await db.insert(adminUsers).values({
      email,
      name,
      passwordHash,
    });
    console.log(`Compte propriétaire [${email}] créé avec succès.`);
  }

  if (db.$close) await db.$close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur lors de la création de l'administrateur :", err);
  process.exit(1);
});

