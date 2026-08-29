import { AppShell } from "@/components/layout/app-shell";
import OsDashboardV2 from "@/components/orders-service/os-dashboard-v2";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser(
    "ORDENS_SERVICO.DASHBOARD.VISUALIZAR",
  );

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <OsDashboardV2 />
    </AppShell>
  );
}
