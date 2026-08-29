import { AppShell } from "@/components/layout/app-shell";
import OperationalServicesManager from "@/components/operational-services/operational-services-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string }>;
}) {
  const user = await requireOperationalUser("OPERACIONAL.OS.VISUALIZAR");
  const { situacao = "" } = await searchParams;

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <OperationalServicesManager
        canEdit={
          user.permissoes?.includes("OPERACIONAL.OS.EDITAR_DADOS") ?? false
        }
        initialSituation={situacao}
      />
    </AppShell>
  );
}
