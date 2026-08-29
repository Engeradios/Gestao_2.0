import { AppShell } from "@/components/layout/app-shell";
import OperationalRouteManager from "@/components/operational-route/operational-route-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser("OPERACIONAL.ROTEIRO.VISUALIZAR");
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <OperationalRouteManager
        canManage={
          user.permissoes?.includes("OPERACIONAL.ROTEIRO.GERENCIAR") ?? false
        }
      />
    </AppShell>
  );
}
