"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Counters = Record<string, number>;

type Group = {
  total: number;
  estados: Counters;
  sla: Counters;
};

type Dashboard = {
  geradoEm: string;
  total: number;
  grupos: Record<string, Group>;
};

type DashboardMode = "OPERACIONAL" | "LABORATORIO";

const labels: Record<string, string> = {
  RJ: "Rio de Janeiro",
  SP: "São Paulo",
  OUTRAS_UF: "Outras UFs",
  LABORATORIO: "Laboratório",
  NAO_INFORMADA: "UF não informada",
};

const stateLabels: Record<string, string> = {
  ABERTA: "Abertas",
  AGUARDANDO_TRATATIVA: "Aguardando tratativa",
  FECHADA: "Fechadas",
  CANCELADA: "Canceladas",
};

const slaLabels: Record<string, string> = {
  NORMAL: "Normal",
  ATENCAO: "Atenção",
  URGENTE: "Urgente",
  CRITICO: "Crítico",
  SEM_CALCULO: "Sem cálculo",
};

const slaColors: Record<string, string> = {
  NORMAL: "bg-emerald-500",
  ATENCAO: "bg-amber-500",
  URGENTE: "bg-orange-500",
  CRITICO: "bg-red-600",
  SEM_CALCULO: "bg-slate-400",
};

function format(value: number | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR");
}

export default function OsDashboardV2() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardMode, setDashboardMode] =
    useState<DashboardMode>("OPERACIONAL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/ordens-servico/dashboard",
        {
          cache: "no-store",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ??
            "Falha ao carregar dashboard",
        );
      }

      setData(payload);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao carregar dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void load(),
      0,
    );

    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleGroups = useMemo<
    Record<string, Group>
  >(() => {
    return Object.fromEntries(
      Object.entries(data?.grupos ?? {}).filter(
        ([key]) =>
          dashboardMode === "LABORATORIO"
            ? key === "LABORATORIO"
            : key !== "LABORATORIO",
      ),
    );
  }, [data, dashboardMode]);

  const totals = useMemo(() => {
    const groups = Object.values(visibleGroups);

    const state = (name: string) =>
      groups.reduce(
        (sum, group) =>
          sum + (group.estados[name] ?? 0),
        0,
      );

    const sla = (name: string) =>
      groups.reduce(
        (sum, group) =>
          sum + (group.sla[name] ?? 0),
        0,
      );

    return {
      total: groups.reduce(
        (sum, group) => sum + group.total,
        0,
      ),
      abertas: state("ABERTA"),
      aguardando: state("AGUARDANDO_TRATATIVA"),
      fechadas: state("FECHADA"),
      canceladas: state("CANCELADA"),
      criticas: sla("CRITICO"),
    };
  }, [visibleGroups]);

  const isLaboratory =
    dashboardMode === "LABORATORIO";

  return (
    <section
      className="space-y-6"
      aria-labelledby="os-dashboard-title"
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-red-600">
            Gestão operacional
          </p>

          <h1
            id="os-dashboard-title"
            className="text-2xl font-bold text-slate-950 dark:text-white"
          >
            {isLaboratory
              ? "Dashboard Laboratório"
              : "Dashboard de Ordens de Serviço"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Indicadores operacionais, regionais e
            classificação SLA.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <RefreshCw
            size={16}
            className={
              loading ? "animate-spin" : ""
            }
          />
          Atualizar
        </button>
      </header>

      <div
        role="tablist"
        aria-label="Selecionar dashboard"
        className="inline-flex w-full rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto dark:border-slate-800 dark:bg-slate-900"
      >
        <DashboardTab
          active={!isLaboratory}
          icon={<ClipboardList size={17} />}
          label="Dashboard OS"
          onClick={() =>
            setDashboardMode("OPERACIONAL")
          }
        />

        <DashboardTab
          active={isLaboratory}
          icon={<FlaskConical size={17} />}
          label="Dashboard Laboratório"
          onClick={() =>
            setDashboardMode("LABORATORIO")
          }
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs text-slate-500">
          Exibindo:{" "}
          <strong>
            {isLaboratory
              ? "ordens destinadas ao laboratório"
              : "ordens operacionais, exceto laboratório"}
          </strong>
          {data?.geradoEm
            ? ` · Atualizado em ${new Date(
                data.geradoEm,
              ).toLocaleString("pt-BR")}`
            : ""}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Carregando indicadores...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              icon={
                isLaboratory ? (
                  <FlaskConical />
                ) : (
                  <ClipboardList />
                )
              }
              label={
                isLaboratory
                  ? "Total no laboratório"
                  : "Total de OS"
              }
              value={format(totals.total)}
            />

            <Kpi
              icon={<Clock3 />}
              label="Abertas"
              value={format(totals.abertas)}
              tone="blue"
            />

            <Kpi
              icon={<AlertTriangle />}
              label="Aguardando tratativa"
              value={format(totals.aguardando)}
              tone="amber"
            />

            <Kpi
              icon={<CheckCircle2 />}
              label="Fechadas"
              value={format(totals.fechadas)}
              tone="green"
            />

            <Kpi
              icon={<AlertTriangle />}
              label="SLA crítico"
              value={format(totals.criticas)}
              tone="red"
            />
          </div>

          {Object.keys(visibleGroups).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              Nenhum dado disponível para este dashboard.
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {Object.entries(visibleGroups).map(
                ([key, group]) => (
                  <ScopeCard
                    key={key}
                    name={labels[key] ?? key}
                    group={group}
                  />
                ),
              )}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/ordens-servico/painel"
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Abrir painel operacional
        </Link>

        <Link
          href="/ordens-servico/laboratorio"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          Abrir laboratório
        </Link>
      </div>
    </section>
  );
}

function DashboardTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
        active
          ? "bg-red-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    green:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  }[tone];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span
        className={`mb-4 inline-flex rounded-xl p-2 ${colors}`}
      >
        {icon}
      </span>

      <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </article>
  );
}

function ScopeCard({
  name,
  group,
}: {
  name: string;
  group: Group;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Escopo
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
            {name}
          </h2>
        </div>

        <span className="text-3xl font-bold">
          {format(group.total)}
        </span>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {Object.entries(stateLabels).map(
          ([state, label]) => (
            <div
              key={state}
              className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60"
            >
              <p className="text-xs uppercase text-slate-500">
                {label}
              </p>

              <p className="mt-1 text-2xl font-bold">
                {format(group.estados[state])}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="mt-5 space-y-3">
        {Object.entries(group.sla).map(
          ([sla, quantity]) => {
            const percentage = group.total
              ? Math.min(
                  100,
                  (quantity / group.total) * 100,
                )
              : 0;

            return (
              <div key={sla}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span>
                    {slaLabels[sla] ??
                      sla.replaceAll("_", " ")}
                  </span>

                  <strong>{format(quantity)}</strong>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      slaColors[sla] ??
                      "bg-slate-500"
                    }`}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          },
        )}
      </div>
    </article>
  );
}
