import { DashboardTvViewer } from "@/components/dashboard-tv/dashboard-tv-viewer";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOperationalUser("DASHBOARD_TV.PAINEL.VISUALIZAR");
  return <DashboardTvViewer id={id} />;
}
