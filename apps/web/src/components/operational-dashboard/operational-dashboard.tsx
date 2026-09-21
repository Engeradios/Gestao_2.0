"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  PackageX,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  Users,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

type GroupCount = { _count?: { _all?: number } };
type ServiceDashboard = {
  total: number;
  ativos: number;
  atrasados: number;
  concluidos: number;
  cancelados: number;
  emDia: number;
  emAndamento: number;
  aguardandoCliente: number;
  faltaMaterial: number;
  planejamento: number;
  porStatus?: Array<GroupCount & { status?: string | null }>;
  porResponsavel?: Array<GroupCount & { responsavel?: string | null }>;
  porUf?: Array<GroupCount & { ufExecucao?: string | null }>;
};

type OrdersIndicators = {
  total: number;
  abertas: number;
  fechadas: number;
  canceladas: number;
  clientes: number;
  ultimaSincronizacao?: string;
};

type PreventiveIndicators = {
  total: number;
  emDia: number;
  atencao: number;
  atrasadas: number;
  contratosVencendo: number;
};

type Visit = {
  id: string;
  tecnico: string;
  tipo: string;
  status: string;
  turno: string;
  servico?: { proposta?: string | null; cliente?: string | null } | null;
  preventiva?: { clienteNome?: string | null } | null;
};

type State = {
  services: ServiceDashboard;
  orders: OrdersIndicators;
  preventives: PreventiveIndicators;
  visits: Visit[];
};

const empty: State = {
  services: {
    total: 0,
    ativos: 0,
    atrasados: 0,
    concluidos: 0,
    cancelados: 0,
    emDia: 0,
    emAndamento: 0,
    aguardandoCliente: 0,
    faltaMaterial: 0,
    planejamento: 0,
  },
  orders: { total: 0, abertas: 0, fechadas: 0, canceladas: 0, clientes: 0 },
  preventives: {
    total: 0,
    emDia: 0,
    atencao: 0,
    atrasadas: 0,
    contratosVencendo: 0,
  },
  visits: [],
};

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (payload as { message?: string }).message || "Falha ao carregar dados",
    );
  }
  return payload as T;
}

function number(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function ratio(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export default function OperationalDashboard() {
  const [data, setData] = useState<State>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);
    try {
      const [services, orders, preventives, route] = await Promise.all([
        request<ServiceDashboard>("/api/operacional/painel"),
        request<OrdersIndicators>("/api/operacional/os/indicadores"),
        request<PreventiveIndicators>(
          "/api/operacional/preventivas/indicadores",
        ),
        request<Visit[]>(
          `/api/operacional/roteiro/agenda?dataInicio=${today}&dataFim=${today}&unidade=RJ`,
        ),
      ]);
      setData({ services, orders, preventives, visits: route });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Erro ao carregar dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const s = data.services;
  const noPrazo = ratio(s.emDia, s.ativos);
  const conclusao = ratio(s.concluidos, s.total);

  const situations: Array<{
    label: string;
    value: number;
    href: string;
    icon: LucideIcon;
    color: string;
  }> = [
    {
      label: "Atrasados",
      value: s.atrasados,
      href: "/operacional/servicos?situacao=atrasado",
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50 dark:bg-red-950/40",
    },
    {
      label: "Em dia",
      value: s.emDia,
      href: "/operacional/servicos?situacao=em_dia",
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Em andamento",
      value: s.emAndamento,
      href: "/operacional/servicos?situacao=em_andamento",
      icon: Wrench,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Planejamento",
      value: s.planejamento,
      href: "/operacional/servicos?situacao=planejamento",
      icon: TimerReset,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "Aguardando cliente",
      value: s.aguardandoCliente,
      href: "/operacional/servicos?situacao=aguardando_cliente",
      icon: Users,
      color: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
    },
    {
      label: "Falta material",
      value: s.faltaMaterial,
      href: "/operacional/servicos?situacao=falta_material",
      icon: PackageX,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40",
    },
  ];

  return (
    <section
      className="space-y-6"
      aria-labelledby="dashboard-operacional-title"
    >
      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">
              Operacional
            </p>
            <h1
              id="dashboard-operacional-title"
              className="mt-2 text-3xl font-bold"
            >
              Centro de controle operacional
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Serviços das áreas OPERACIONAL e AMBAS, ordens de serviço,
              preventivas e roteiro técnico.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar dados
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroMetric
            label="Serviços ativos"
            value={s.ativos}
            detail={`${s.total} serviços no escopo`}
          />
          <HeroMetric
            label="No prazo"
            value={`${noPrazo}%`}
            detail={`${number(s.emDia)} serviços em dia`}
          />
          <HeroMetric
            label="Conclusão"
            value={`${conclusao}%`}
            detail={`${number(s.concluidos)} concluídos`}
          />
          <HeroMetric
            label="Visitas hoje"
            value={data.visits.length}
            detail="Agenda técnica no RJ"
          />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <section aria-labelledby="situacoes-title">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 id="situacoes-title" className="text-lg font-bold">
              Situação dos serviços
            </h2>
            <p className="text-sm text-slate-500">
              Clique em um indicador para abrir a listagem filtrada.
            </p>
          </div>
          <Link
            href="/operacional/servicos"
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {situations.map((item) => (
            <SituationCard key={item.label} {...item} loading={loading} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Distribution
          title="Serviços por status"
          rows={(s.porStatus || []).map((item) => ({
            label: item.status || "Sem status",
            value: Number(item._count?._all || 0),
          }))}
          total={s.total}
          color="bg-red-600"
        />
        <Distribution
          title="Responsáveis"
          rows={(s.porResponsavel || []).map((item) => ({
            label: item.responsavel || "Não definido",
            value: Number(item._count?._all || 0),
          }))}
          total={s.ativos}
          color="bg-blue-600"
        />
        <Distribution
          title="Execução por UF"
          rows={(s.porUf || []).map((item) => ({
            label: item.ufExecucao || "Não definida",
            value: Number(item._count?._all || 0),
          }))}
          total={s.total}
          color="bg-emerald-600"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ModulePanel
          title="Ordens de serviço"
          icon={ClipboardList}
          href="/ordens-servico/painel"
          items={[
            ["Total", data.orders.total],
            ["Abertas", data.orders.abertas],
            ["Fechadas", data.orders.fechadas],
            ["Clientes", data.orders.clientes],
          ]}
        />
        <ModulePanel
          title="Preventivas"
          icon={ShieldCheck}
          href="/operacional/preventivas"
          items={[
            ["Total", data.preventives.total],
            ["Em dia", data.preventives.emDia],
            ["Atenção", data.preventives.atencao],
            ["Atrasadas", data.preventives.atrasadas],
          ]}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarDays className="h-5 w-5 text-red-600" />
              Roteiro de hoje
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Até 10 atividades programadas para a unidade RJ.
            </p>
          </div>
          <Link
            href="/operacional/roteiro-tecnico"
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            Abrir roteiro
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-3">Técnico</th>
                <th className="pb-3">Origem</th>
                <th className="pb-3">Turno</th>
                <th className="pb-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {data.visits.length ? (
                data.visits.slice(0, 10).map((visit) => (
                  <tr
                    key={visit.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  >
                    <td className="py-3 font-semibold">{visit.tecnico}</td>
                    <td className="py-3">
                      {visit.servico?.proposta ||
                        visit.preventiva?.clienteNome ||
                        visit.tipo}
                    </td>
                    <td className="py-3">{visit.turno}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">
                        {visit.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Nenhuma visita agendada para hoje no RJ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function HeroMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-300">{detail}</p>
    </div>
  );
}

function SituationCard({
  label,
  value,
  href,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
  color: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-2xl font-bold">
          {loading ? "…" : number(value)}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700 group-hover:text-red-600 dark:text-slate-200">
        {label}
      </p>
    </Link>
  );
}

function Distribution({
  title,
  rows,
  total,
  color,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  total: number;
  color: string;
}) {
  return (
    <article className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.slice(0, 8).map((row) => {
            const pct = total ? Math.min(100, (row.value / total) * 100) : 0;
            return (
              <div key={row.label}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="truncate">{row.label}</span>
                  <b>{number(row.value)}</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            Nenhum dado disponível.
          </p>
        )}
      </div>
    </article>
  );
}

function ModulePanel({
  title,
  icon: Icon,
  href,
  items,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  items: Array<[string, number]>;
}) {
  return (
    <article className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon className="h-5 w-5 text-red-600" />
          {title}
        </h2>
        <Link
          href={href}
          className="text-sm font-semibold text-red-600 hover:underline"
        >
          Abrir módulo
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold">{number(value)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
