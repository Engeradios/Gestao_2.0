import { AppShell } from "@/components/layout/app-shell";
import { PurchasesDashboard } from "@/components/purchases/purchases-dashboard";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function Page(){const user=await requireOperationalUser("COMPRAS.DASHBOARD.VISUALIZAR");return <AppShell userName={user.nome} userEmail={user.email}><PurchasesDashboard/></AppShell>}
