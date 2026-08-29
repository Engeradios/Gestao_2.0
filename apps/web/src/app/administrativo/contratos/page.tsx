import { ContractsManager } from "@/components/administrative-contracts/contracts-manager";
import { AppShell } from "@/components/layout/app-shell";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function ContractsPage() {
  const user = await requireOperationalUser("ADMINISTRATIVO.CONTRATOS.VISUALIZAR");
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <ContractsManager canManage={user.permissoes?.includes("ADMINISTRATIVO.CONTRATOS.GERENCIAR") ?? false} canDocuments={user.permissoes?.includes("ADMINISTRATIVO.CONTRATOS.DOCUMENTOS") ?? false} />
    </AppShell>
  );
}
