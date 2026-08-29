import { AppShell } from "@/components/layout/app-shell";
import { PurchasesSuppliers } from "@/components/purchases/purchases-suppliers";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page(){const user=await requireOperationalUser("COMPRAS.FORNECEDORES.VISUALIZAR");return <AppShell userName={user.nome} userEmail={user.email}><PurchasesSuppliers canManage={user.permissoes?.includes("COMPRAS.FORNECEDORES.GERENCIAR")??false}/></AppShell>}
