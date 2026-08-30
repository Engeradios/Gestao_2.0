import { GeolocationDashboard } from "@/components/geolocation/geolocation-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser(
    "APP_CAMPO.LOCALIZACAO.VISUALIZAR",
  );
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <GeolocationDashboard />
    </AppShell>
  );
}
