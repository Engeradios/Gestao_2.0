import { AppShell } from "@/components/layout/app-shell";
import OperationalDashboard from "@/components/operational-dashboard/operational-dashboard";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser("OPERACIONAL.OS.VISUALIZAR");
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <OperationalDashboard />
    </AppShell>
  );
}
