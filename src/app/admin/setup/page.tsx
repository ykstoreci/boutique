import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { adminUsers } from "@/db/schema";
import { AdminSetupForm } from "@/components/admin/AdminSetupForm";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  // En développement local : accès direct à l'administration sans configuration requise
  if (process.env.NODE_ENV !== "production") {
    redirect("/admin");
  }

  // En production : vérifier si un administrateur existe déjà
  try {
    const db = await getDb();
    const [existingAdmin] = await db.select().from(adminUsers).limit(1);
    if (existingAdmin) {
      redirect("/admin/login");
    }
  } catch {
    // Continuer vers le formulaire si la base s'initialise
  }

  return <AdminSetupForm />;
}
