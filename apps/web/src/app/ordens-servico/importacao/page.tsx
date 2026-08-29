import { AppShell } from "@/components/layout/app-shell";
import { OsImportClient } from "@/components/orders-service/os-import-client";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page() {
  const user = await requireOperationalUser(
    "ORDENS_SERVICO.IMPORTACAO.EXECUTAR",
  );
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <OsImportClient
        canManage={Boolean(
          user.permissoes?.includes("ORDENS_SERVICO.IMPORTACAO.EXECUTAR"),
        )}
      />
    </AppShell>
  );
}
