import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationPreferencesManager } from "@/components/notifications/notification-preferences-manager";

export default async function NotificationPreferencesPage() {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) redirect("/login");

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/profile`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) redirect("/login");

  const user = await response.json();

  if (user.trocarSenha) redirect("/trocar-senha");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <NotificationPreferencesManager />
    </AppShell>
  );
}
