import { AppShell } from "@/components/layout/app-shell";
import { AdminNotificationsManager } from "@/components/notifications/admin-notifications-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function AdminNotificationsPage() {
  const user = await requireOperationalUser(
    "FERRAMENTAS.NOTIFICACOES.VISUALIZAR",
  );

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <AdminNotificationsManager
        canManage={
          user.permissoes?.includes("FERRAMENTAS.NOTIFICACOES.GERENCIAR") ??
          false
        }
      />
    </AppShell>
  );
}
