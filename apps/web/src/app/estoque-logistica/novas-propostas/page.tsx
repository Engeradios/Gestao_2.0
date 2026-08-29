import { AppShell } from "@/components/layout/app-shell";
import { LogisticsProposalsManager } from "@/components/logistics-proposals/logistics-proposals-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function LogisticsProposalsPage() {
  const user = await requireOperationalUser(
    "ESTOQUE_LOGISTICA.NOVAS_PROPOSTAS.VISUALIZAR",
  );

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <LogisticsProposalsManager
        canManage={
          user.permissoes?.includes(
            "ESTOQUE_LOGISTICA.NOVAS_PROPOSTAS.GERENCIAR",
          ) ?? false
        }
      />
    </AppShell>
  );
}
