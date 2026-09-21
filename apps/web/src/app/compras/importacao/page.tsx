import { AppShell } from "@/components/layout/app-shell";
import { PurchasesImportPreview } from "@/components/purchases/purchases-import-preview";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function Page() {
  const user = await requireOperationalUser("COMPRAS.IMPORTACAO.VISUALIZAR");
  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <PurchasesImportPreview />
    </AppShell>
  );
}
