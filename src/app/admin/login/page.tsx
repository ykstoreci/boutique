import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // En développement local : aucun écran de connexion, accès direct au tableau de bord
  if (process.env.NODE_ENV !== "production") {
    redirect("/admin");
  }

  // En production : si l'utilisateur a déjà une session valide, rediriger vers /admin
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
