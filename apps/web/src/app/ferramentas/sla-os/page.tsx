import { AppShell } from "@/components/layout/app-shell";
import { OsSlaManager } from "@/components/sla-os/os-sla-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function OsSlaPage() {
  const user = await requireOperationalUser(
    "FERRAMENTAS.SLA_OS.GERENCIAR",
  );

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <OsSlaManager />
    </AppShell>
  );
}
