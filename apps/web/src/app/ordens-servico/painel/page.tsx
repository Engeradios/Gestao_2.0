import { AppShell } from "@/components/layout/app-shell";
import { OrdersPanel } from "@/components/orders-service/orders-panel";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser("ORDENS_SERVICO.PAINEL.VISUALIZAR");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <OrdersPanel
        endpoint="/api/ordens-servico/painel"
        title="Painel Operacional"
      />
    </AppShell>
  );
}
