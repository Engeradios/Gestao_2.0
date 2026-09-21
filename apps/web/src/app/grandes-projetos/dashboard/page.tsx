import { AppShell } from "@/components/layout/app-shell";
import { GpDashboard } from "@/components/grandes-projetos/gp-client";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page() {
  const u = await requireOperationalUser(
    "GRANDES_PROJETOS.PROJETOS.VISUALIZAR",
  );
  return (
    <AppShell userName={u.nome} userEmail={u.email}>
      <GpDashboard />
    </AppShell>
  );
}
