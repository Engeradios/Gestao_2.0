import { AppShell } from "@/components/layout/app-shell";
import { UnderConstruction } from "@/components/administrative/under-construction";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser("PROPOSTAS.PAINEL.VISUALIZAR");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <UnderConstruction
        category="Orçamento"
        title="Painel de Orçamento"
        description="Cadastro, acompanhamento, filtros e gestão dos orçamentos serão disponibilizados neste espaço."
      />
    </AppShell>
  );
}
