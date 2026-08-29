import { AppShell } from "@/components/layout/app-shell";
import { UnderConstruction } from "@/components/administrative/under-construction";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function AdministrativeClientsPage() {
  const user = await requireOperationalUser("FERRAMENTAS.USUARIOS.VISUALIZAR");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <UnderConstruction
        title="Clientes"
        description="O cadastro administrativo e a visão consolidada dos clientes serão disponibilizados neste espaço."
      />
    </AppShell>
  );
}
