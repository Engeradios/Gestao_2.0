import { AppShell } from "@/components/layout/app-shell";
import { PeopleManager } from "@/components/reference-data/people-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser("FERRAMENTAS.CADASTROS.VISUALIZAR");

  const canManage =
    user.permissoes?.includes("FERRAMENTAS.PESSOAS.GERENCIAR") ?? false;

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <PeopleManager
        canManage={canManage}
        title="Técnicos"
        fixedFunction="TECNICO"
      />
    </AppShell>
  );
}
