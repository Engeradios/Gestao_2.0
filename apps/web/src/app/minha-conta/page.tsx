import Link from "next/link";
import { Bell, History, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedUser } from "@/lib/operational-page-auth";

const linkClass =
  "group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-red-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-red-900";

export default async function MyAccountPage() {
  const user = await requireAuthenticatedUser();

  const options = [
    {
      href: "/minha-conta/seguranca",
      label: "Senha e segurança",
      description: "Altere sua senha de acesso com segurança.",
      icon: ShieldCheck,
    },
    {
      href: "/minha-conta/notificacoes",
      label: "Notificações",
      description: "Configure quais comunicações deseja receber.",
      icon: Bell,
    },
    {
      href: "/minha-conta/acessos",
      label: "Histórico de acessos",
      description: "Consulte os registros de autenticação da conta.",
      icon: History,
    },
    {
      href: `mailto:${user.email}`,
      label: "E-mail cadastrado",
      description: user.email,
      icon: Mail,
    },
  ];

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
            Minha conta
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Informações e preferências
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Consulte os dados da conta e gerencie segurança e notificações.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-xl font-bold text-white">
              {user.nome.charAt(0).toUpperCase()}
            </span>

            <div>
              <h2 className="text-xl font-semibold">{user.nome}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {options.map((option) => {
            const Icon = option.icon;

            return (
              <Link key={option.href} href={option.href} className={linkClass}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                  <Icon size={21} />
                </span>

                <h2 className="mt-4 font-semibold group-hover:text-red-600">
                  {option.label}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {option.description}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          <KeyRound size={17} className="mr-2 inline" />
          As permissões da conta são administradas pelos perfis de acesso do
          sistema.
        </div>
      </div>
    </AppShell>
  );
}
