import Link from "next/link";
import {
  ClipboardList,
  FileText,
  Landmark,
  PackageOpen,
  RadioTower,
  Settings,
  ShieldCheck,
  Waypoints,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedUser } from "@/lib/operational-page-auth";

const modules = [
  {
    title: "Propostas",
    description: "Propostas comerciais, painel e importações.",
    href: "/propostas/dashboard",
    icon: FileText,
  },
  {
    title: "Ordens de Serviço",
    description: "Painel, acompanhamento e importação de OS.",
    href: "/ordens-servico/dashboard",
    icon: ClipboardList,
  },
  {
    title: "Operacional",
    description: "Serviços, clientes, preventivas e operações.",
    href: "/operacional/dashboard",
    icon: Wrench,
  },
  {
    title: "Grandes Projetos",
    description: "Projetos, acompanhamento e relatórios.",
    href: "/grandes-projetos/dashboard",
    icon: RadioTower,
  },
  {
    title: "Vistorias",
    description: "Acesso ao módulo de vistorias técnicas.",
    href: "/vistoria",
    icon: ShieldCheck,
  },
  {
    title: "Estoque e Logística",
    description: "Roteiros de entrega e operação logística.",
    href: "/estoque-logistica/roteiro-entrega",
    icon: PackageOpen,
  },
  {
    title: "Financeiro",
    description: "Contas, fluxo financeiro, DRE e importações.",
    href: "/financeiro",
    icon: Landmark,
  },
  {
    title: "Roteiro Técnico",
    description: "Agenda e planejamento das equipes técnicas.",
    href: "/operacional/roteiro-tecnico",
    icon: Waypoints,
  },
  {
    title: "Ferramentas",
    description: "Usuários, perfis, auditoria e configurações.",
    href: "/ferramentas/usuarios",
    icon: Settings,
  },
];

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
            Gestão Engerádios
          </p>

          <h1 className="mt-1 text-3xl font-bold">Visão Geral</h1>

          <p className="mt-2 text-sm text-slate-500">
            Selecione um módulo para continuar.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-red-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-red-900"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-red-100 text-red-700 transition group-hover:bg-red-600 group-hover:text-white dark:bg-red-950 dark:text-red-300">
                  <Icon size={23} />
                </span>

                <h2 className="mt-5 text-lg font-semibold group-hover:text-red-600">
                  {module.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
