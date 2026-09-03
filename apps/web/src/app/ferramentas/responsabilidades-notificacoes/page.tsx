import { AppShell } from "@/components/layout/app-shell";
import { NotificationResponsibilitiesManager } from "@/components/notifications/notification-responsibilities-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";
const permission = "OPERACIONAL.NOTIFICACOES_OBRA.GERENCIAR_RESPONSABILIDADES";
export default async function Page() {
  const user = await requireOperationalUser(permission);
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <NotificationResponsibilitiesManager />
    </AppShell>
  );
}
