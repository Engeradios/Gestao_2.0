import { AppShell } from "@/components/layout/app-shell";
import { PurchasesPanel } from "@/components/purchases/purchases-panel";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page(){const user=await requireOperationalUser("COMPRAS.PAINEL.VISUALIZAR");return <AppShell userName={user.nome} userEmail={user.email}><PurchasesPanel/></AppShell>}
