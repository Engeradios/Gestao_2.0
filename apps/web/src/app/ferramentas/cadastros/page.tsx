import { CarFront, ContactRound, HardHat, IdCard, Truck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { requireOperationalUser } from "@/lib/operational-page-auth";

const items = [
  {
    title: "Pessoas",
    description:
      "Cadastro central de colaboradores, contatos, cargos, unidades e funcoes.",
    href: "/ferramentas/cadastros/pessoas",
    icon: ContactRound,
  },
  {
    title: "Tecnicos",
    description:
      "Pessoas habilitadas para atendimento e execucao de servicos tecnicos.",
    href: "/ferramentas/cadastros/tecnicos",
    icon: HardHat,
  },
  {
    title: "Motoristas",
    description:
      "Motoristas, entregadores, situacao da CNH e disponibilidade operacional.",
    href: "/ferramentas/cadastros/motoristas",
    icon: Truck,
  },
  {
    title: "Veiculos",
    description:
      "Frota, placas, tipos, marcas, modelos e situacao operacional.",
    href: "/ferramentas/cadastros/veiculos",
    icon: CarFront,
  },
];

export default async function ReferenceDataPage() {
  const user = await requireOperationalUser("FERRAMENTAS.CADASTROS.VISUALIZAR");

  return (
    <AppShell userName={user.nome} userEmail={user.email}>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-red-600">Hub Ferramentas</p>
          <h1 className="mt-1 text-3xl font-bold">Cadastros administrativos</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Base central de pessoas, tecnicos, motoristas e veiculos utilizados
            nos modulos operacionais e logisticos.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-red-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40">
                  <Icon size={24} />
                </span>
                <h2 className="mt-5 text-lg font-bold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-600">
                  Acessar cadastro
                  <IdCard
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
