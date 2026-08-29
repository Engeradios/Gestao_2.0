import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function PortalChamadosPage() {
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

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <main className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="font-semibold text-red-600">Atendimento</p>
          <h1 className="text-3xl font-bold">Portal de Chamados</h1>
          <p className="mt-2 text-slate-500">
            Central de abertura e acompanhamento de chamados.
          </p>
        </header>

        <section className="rounded-3xl border bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-amber-100 text-4xl">
            🚧
          </div>

          <h2 className="mt-6 text-2xl font-bold">Módulo em construção</h2>

          <p className="mx-auto mt-3 max-w-2xl text-slate-500">
            Este módulo será utilizado para abertura, classificação,
            acompanhamento e histórico dos chamados.
          </p>

          <span className="mt-6 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
            Em construção
          </span>
        </section>
      </main>
    </AppShell>
  );
}
