import { AppShell } from "@/components/layout/app-shell";
import { VehicleManager } from "@/components/reference-data/vehicle-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function VehiclesPage() {
  const user = await requireOperationalUser("FERRAMENTAS.CADASTROS.VISUALIZAR");

  const canManage =
    user.permissoes?.includes("FERRAMENTAS.VEICULOS.GERENCIAR") ?? false;

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <VehicleManager canManage={canManage} />
    </AppShell>
  );
}
