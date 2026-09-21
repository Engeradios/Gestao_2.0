import { AppShell } from "@/components/layout/app-shell";
import { ServiceDetailsManager } from "@/components/operational-services/service-details-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function ServiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOperationalUser("OPERACIONAL.OS.VISUALIZAR");
  const { id } = await params;

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <ServiceDetailsManager
            serviceId={id}
            canManage={Boolean(
              user.permissoes?.includes("OPERACIONAL.OS.GERENCIAR"),
            )}
          />
    </AppShell>
  );
}
