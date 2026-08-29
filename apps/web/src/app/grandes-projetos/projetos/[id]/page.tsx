import { AppShell } from "@/components/layout/app-shell";
import { GpDetail } from "@/components/grandes-projetos/gp-client";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const u = await requireOperationalUser(
    "GRANDES_PROJETOS.PROJETOS.VISUALIZAR",
  );
  const { id } = await params;
  return (
    <AppShell userName={u.nome} userEmail={u.email}>
      <GpDetail
        id={Number(id)}
        canManage={
          u.permissoes?.includes("GRANDES_PROJETOS.PROJETOS.GERENCIAR") ?? false
        }
        canDelete={
          u.permissoes?.includes("GRANDES_PROJETOS.PROJETOS.EXCLUIR") ?? false
        }
        canRestore={
          u.permissoes?.includes("GRANDES_PROJETOS.PROJETOS.RESTAURAR") ?? false
        }
        canManageOs={
          u.permissoes?.includes("GRANDES_PROJETOS.OS.GERENCIAR") ?? false
        }
      />
    </AppShell>
  );
}
