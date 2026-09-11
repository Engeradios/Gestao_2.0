import { AppShell } from "@/components/layout/app-shell";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function DpRhLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireOperationalUser("DP_RH.DASHBOARD.VISUALIZAR");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
