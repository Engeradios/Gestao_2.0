import { AppShell } from "@/components/layout/app-shell";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function FinanceiroLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireOperationalUser(
    "FINANCEIRO.VISAO_GERAL.VISUALIZAR",
  );

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
