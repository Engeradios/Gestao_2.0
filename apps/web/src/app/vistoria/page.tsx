import { Construction } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

export default async function VistoriaPage() {
  const token = (await cookies()).get("engeradios_token")?.value;

  if (!token) redirect("/login");

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/profile`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!response.ok) redirect("/login");

  const user = await response.json();

  if (user.trocarSenha) redirect("/trocar-senha");

  if (!user.permissoes?.includes("VISTORIA.VISTORIAS.VISUALIZAR")) {
    redirect("/dashboard");
  }

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <main className="mx-auto max-w-[1600px] p-4 md:p-6">
        <PageHeader
          section="Operações"
          title="Vistorias"
          description="Módulo reservado para implementação futura."
        />

        <section className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
          <div className="max-w-lg">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Construction size={40} />
            </div>

            <h2 className="mt-6 text-2xl font-bold">Módulo em construção</h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              A área de Vistorias será implementada em uma etapa futura. Nenhuma
              funcionalidade está disponível neste momento.
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
