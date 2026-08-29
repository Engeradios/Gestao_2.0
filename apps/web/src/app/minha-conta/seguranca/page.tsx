import { AccountSecurityManager } from "@/components/account/account-security-manager";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedUser } from "@/lib/operational-page-auth";

export default async function AccountSecurityPage() {
  const user = await requireAuthenticatedUser();

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <AccountSecurityManager />
    </AppShell>
  );
}
