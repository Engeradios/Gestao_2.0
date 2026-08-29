import { AppShell } from "@/components/layout/app-shell";
import { MailConfigurationManager } from "@/components/mail/mail-configuration-manager";
import { requireOperationalUser } from "@/lib/operational-page-auth";

export default async function MailConfigurationPage() {
  const user = await requireOperationalUser("FERRAMENTAS.EMAIL.CONFIGURAR");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <MailConfigurationManager />
    </AppShell>
  );
}
