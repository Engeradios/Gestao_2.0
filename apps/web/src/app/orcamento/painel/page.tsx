import { AppShell } from "@/components/layout/app-shell";
import { OrcamentoPainel } from "@/components/orcamento/orcamento-painel";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser("PROPOSTAS.PAINEL.VISUALIZAR");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <OrcamentoPainel />
    </AppShell>
  );
}
