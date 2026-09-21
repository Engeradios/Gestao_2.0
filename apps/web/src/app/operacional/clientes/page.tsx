import { AppShell } from "@/components/layout/app-shell";
import { ClientsManager } from "@/components/operational-clients/clients-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page() {
  const user = await requireOperationalUser("OPERACIONAL.OS.VISUALIZAR");
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <ClientsManager
        canManage={!!user.permissoes?.includes("OPERACIONAL.OS.GERENCIAR")}
      />
    </AppShell>
  );
}
