import { GeolocationReport } from "@/components/geolocation/geolocation-report";
import { AppShell } from "@/components/layout/app-shell";
import { requireOperationalUser } from "@/lib/operational-page-auth";
export default async function GeolocationReportPage(){const user=await requireOperationalUser("APP_CAMPO.LOCALIZACAO.VISUALIZAR");return <AppShell userName={user.nome} userEmail={user.email}><GeolocationReport/></AppShell>}
