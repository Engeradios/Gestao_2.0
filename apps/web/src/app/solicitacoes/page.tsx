import { AppShell } from "@/components/layout/app-shell";
import { RequestsManager } from "@/components/requests/requests-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function RequestsPage() {
  const user = await requireOperationalUser("SOLICITACOES.CENTRAL.VISUALIZAR");

  const permissions = user.permissoes ?? [];

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <RequestsManager
        canCreate={permissions.includes("SOLICITACOES.CENTRAL.CRIAR")}
        canManage={permissions.includes("SOLICITACOES.CENTRAL.GERENCIAR")}
      />
    </AppShell>
  );
}
