import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProfilesManager } from "@/components/profiles/profiles-manager";

export default async function ProfilesPage() {
  const token = (await cookies()).get("engeradios_token")?.value;
  if (!token) redirect("/login");
  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/profile`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) redirect("/login");
  const user = await response.json();
  if (user.trocarSenha) redirect("/trocar-senha");
  if (!user.permissoes?.includes("FERRAMENTAS.PERFIS.VISUALIZAR"))
    redirect("/dashboard");
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <ProfilesManager />
    </AppShell>
  );
}
