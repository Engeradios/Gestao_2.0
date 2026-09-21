import { cookies } from "next/headers";
import { History, Laptop, MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedUser } from "@/lib/operational-page-auth";

interface AccessRecord {
  id: string;
  ip: string | null;
  userAgent: string | null;
  criadoEm: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AccessHistoryPage() {
  const user = await requireAuthenticatedUser();
  const token = (await cookies()).get("engeradios_token")?.value;

  const response = await fetch(
    `${process.env.API_INTERNAL_URL}/api/v1/auth/access-history`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const accesses: AccessRecord[] = response.ok ? await response.json() : [];

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
            Minha conta
          </p>
          <h1 className="mt-1 text-3xl font-bold">Histórico de acessos</h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulte os últimos acessos autenticados da sua conta.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          {accesses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhum acesso registrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {accesses.map((access, index) => (
                <article
                  key={access.id}
                  className="grid gap-4 p-5 md:grid-cols-[52px_1fr_auto]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                    <History size={21} />
                  </span>

                  <div>
                    <p className="font-semibold">
                      {index === 0 ? "Acesso mais recente" : "Acesso realizado"}
                    </p>

                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                      <p>
                        <MapPin size={15} className="mr-2 inline" />
                        IP: {access.ip || "Não informado"}
                      </p>
                      <p className="break-all">
                        <Laptop size={15} className="mr-2 inline" />
                        {access.userAgent || "Dispositivo não informado"}
                      </p>
                    </div>
                  </div>

                  <time className="text-sm text-slate-500">
                    {formatDate(access.criadoEm)}
                  </time>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
