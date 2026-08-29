import { AppShell } from "@/components/layout/app-shell";
import { DashboardTvEditor } from "@/components/dashboard-tv/dashboard-tv-editor";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOperationalUser("DASHBOARD_TV.PAINEL.VISUALIZAR");
  const p = user.permissoes || [];
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <DashboardTvEditor
        dashboardId={id}
        canManage={p.includes("DASHBOARD_TV.PAINEL.GERENCIAR")}
        canPublish={p.includes("DASHBOARD_TV.PAINEL.PUBLICAR")}
      />
    </AppShell>
  );
}
