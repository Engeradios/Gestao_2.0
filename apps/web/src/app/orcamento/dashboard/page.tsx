import { AppShell } from "@/components/layout/app-shell";
import { UnderConstruction } from "@/components/administrative/under-construction";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser("PROPOSTAS.DASHBOARD.VISUALIZAR");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <UnderConstruction
        category="Orçamento"
        title="Dashboard de Orçamento"
        description="Indicadores, valores, aprovações e desempenho dos orçamentos serão disponibilizados neste espaço."
      />
    </AppShell>
  );
}
