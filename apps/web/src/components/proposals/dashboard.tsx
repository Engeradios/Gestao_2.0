"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Files,
  RefreshCw,
  Target,
} from "lucide-react";

type Row = { nome: string; quantidade: number; valor: number | string };
type Compare = {
  chave: string;
  quantidade: number;
  aprovadas: number;
  valor_aprovado: number | string;
  ini: string;
  fim: string;
};
type Data = {
  filtros: {
    periodo: string;
    periodoLabel: string;
    dataInicio?: string;
    dataFim?: string;
    uf: string | null;
  };
  resumo: {
    total: number;
    aprovadas: number;
    aguardando: number;
    canceladas_inatividade: number;
    taxa_aprovacao: number;
    valor_aprovado: number | string;
    valor_pipeline: number | string;
  };
  status: Row[];
  fases: Row[];
  aprovacaoPorTipo: Array<{
    nome: string;
    total: number;
    aprovadas: number;
    taxa_aprovacao: number | string;
    valor_aprovado: number | string;
  }>;
  serie: Array<{
    mes: string;
    quantidade: number;
    valor_aprovado: number | string;
  }>;
  topClientesValor: Row[];
  topClientesQuantidade: Row[];
  comparativo: Compare[];
  diasInatividade: number;
};
type Filters = { periodo: string; uf: string; ini: string; fim: string };

const money = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );
const integer = (v: unknown) =>
  new Intl.NumberFormat("pt-BR").format(Number(v || 0));
const pct = (actual: number, previous: number) =>
  previous === 0
    ? actual > 0
      ? "+100%"
      : "0%"
    : `${Math.round(((actual - previous) / previous) * 100) >= 0 ? "+" : ""}${Math.round(((actual - previous) / previous) * 100)}%`;
const colors = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#64748b",
];

export function ProposalsDashboard() {
  const [filters, setFilters] = useState<Filters>({
    periodo: "45",
    uf: "",
    ini: "",
    fim: "",
  });
  const [data, setData] = useState<Data | null>(null);
  const [ufs, setUfs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    setError("");
    const q = new URLSearchParams({ periodo: f.periodo });
    if (f.uf) q.set("uf", f.uf);
    if (f.periodo === "custom") {
      if (f.ini) q.set("ini", f.ini);
      if (f.fim) q.set("fim", f.fim);
    }
    try {
      const r = await fetch(`/api/propostas/dashboard?${q}`, {
        cache: "no-store",
      });
      const body = await r.json();
      if (!r.ok)
        throw new Error(
          body.message || "Não foi possível carregar o dashboard.",
        );
      setData(body);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao carregar o dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(filters), 0);
    return () => window.clearTimeout(timer);
  }, [filters, load]);
  useEffect(() => {
    void fetch("/api/propostas/filtros", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((b: { ufs?: string[] }) => setUfs((b.ufs || []).filter(Boolean)))
      .catch(() => undefined);
  }, []);

  const comparison = useMemo(
    () =>
      Object.fromEntries((data?.comparativo || []).map((x) => [x.chave, x])),
    [data],
  );
  const current = comparison.atual || {
    quantidade: 0,
    aprovadas: 0,
    valor_aprovado: 0,
  };
  const previous = comparison.anterior || {
    quantidade: 0,
    aprovadas: 0,
    valor_aprovado: 0,
  };
  const year = comparison.ano_anterior || {
    quantidade: 0,
    aprovadas: 0,
    valor_aprovado: 0,
  };

  return (
    <section className="space-y-6" aria-labelledby="proposals-dashboard-title">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-red-600">
            Gestão comercial
          </p>
          <h2
            id="proposals-dashboard-title"
            className="text-2xl font-bold text-slate-950 dark:text-white"
          >
            Dashboard de Propostas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Indicadores equivalentes ao painel legado, com atualização pelos
            filtros.
          </p>
        </div>
        <button
          onClick={() => void load(filters)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Período">
            <select
              value={filters.periodo}
              onChange={(e) =>
                setFilters((x) => ({ ...x, periodo: e.target.value }))
              }
              className="input"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="45">Últimos 45 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="mes">Este mês</option>
              <option value="ano">Este ano</option>
              <option value="tudo">Todo o período</option>
              <option value="custom">Personalizado</option>
            </select>
          </Field>
          <Field label="UF">
            <select
              value={filters.uf}
              onChange={(e) =>
                setFilters((x) => ({ ...x, uf: e.target.value }))
              }
              className="input"
            >
              <option value="">Todas</option>
              {ufs.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          {filters.periodo === "custom" && (
            <>
              <Field label="De">
                <input
                  type="date"
                  value={filters.ini}
                  onChange={(e) =>
                    setFilters((x) => ({ ...x, ini: e.target.value }))
                  }
                  className="input"
                />
              </Field>
              <Field label="Até">
                <input
                  type="date"
                  value={filters.fim}
                  onChange={(e) =>
                    setFilters((x) => ({ ...x, fim: e.target.value }))
                  }
                  className="input"
                />
              </Field>
            </>
          )}
          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({ periodo: "45", uf: "", ini: "", fim: "" })
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700"
            >
              Restaurar padrão
            </button>
          </div>
        </div>
        {data && (
          <p className="mt-3 text-xs text-slate-500">
            Exibindo: <b>{data.filtros.periodoLabel}</b>
            {data.filtros.uf ? ` · UF: ${data.filtros.uf}` : ""} · Prazo de
            inatividade: {data.diasInatividade} dias
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {loading && !data ? (
        <div className="rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          Carregando indicadores...
        </div>
      ) : (
        data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Kpi
                icon={<Files />}
                label="Propostas no período"
                value={integer(data.resumo.total)}
              />
              <Kpi
                icon={<FileCheck2 />}
                label="Aprovadas"
                value={integer(data.resumo.aprovadas)}
                tone="green"
              />
              <Kpi
                icon={<Clock3 />}
                label="Aguardando"
                value={integer(data.resumo.aguardando)}
                tone="amber"
              />
              <Kpi
                icon={<Target />}
                label="Taxa de aprovação"
                value={`${data.resumo.taxa_aprovacao}%`}
              />
              <Kpi
                icon={<CircleDollarSign />}
                label="Valor aprovado"
                value={money(data.resumo.valor_aprovado)}
                tone="green"
                compact
              />
              <Kpi
                icon={<BarChart3 />}
                label="Valor em pipeline"
                value={money(data.resumo.valor_pipeline)}
                tone="amber"
                compact
              />
            </div>
            {data.resumo.canceladas_inatividade > 0 && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900 dark:bg-violet-950/30">
                {integer(data.resumo.canceladas_inatividade)} proposta(s)
                classificada(s) como cancelada(s) por inatividade.
              </div>
            )}

            <Card
              title="Desempenho comparativo · últimos 12 meses"
              icon={<CalendarDays size={18} />}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <CompareCard title="Mês atual" item={current} />
                <CompareCard
                  title="Mês anterior"
                  item={previous}
                  changeQtd={pct(current.quantidade, previous.quantidade)}
                  changeValue={pct(
                    Number(current.valor_aprovado),
                    Number(previous.valor_aprovado),
                  )}
                />
                <CompareCard
                  title="Mesmo mês do ano anterior"
                  item={year}
                  changeQtd={pct(current.quantidade, year.quantidade)}
                  changeValue={pct(
                    Number(current.valor_aprovado),
                    Number(year.valor_aprovado),
                  )}
                />
              </div>
              <div className="mt-5">
                <SeriesChart rows={data.serie} />
              </div>
            </Card>
            <Card title="Aprovação por tipo de proposta">
              <ApprovalByType rows={data.aprovacaoPorTipo || []} />
            </Card>
            <div className="grid gap-5 xl:grid-cols-2">
              <Card title="Distribuição por status efetivo">
                <HorizontalBars rows={data.status} />
              </Card>
              <Card title="Funil de negociação">
                <HorizontalBars rows={data.fases} color="#2563eb" />
              </Card>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <Card title="Top 10 clientes aprovados por valor">
                <HorizontalBars
                  rows={data.topClientesValor}
                  metric="valor"
                  color="#16a34a"
                />
              </Card>
              <Card title="Top 10 clientes aprovados por quantidade">
                <HorizontalBars
                  rows={data.topClientesQuantidade}
                  color="#dc2626"
                />
              </Card>
            </div>
          </>
        )
      )}
      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          background: transparent;
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
        }
        .dark .input {
          border-color: rgb(51 65 85);
        }
      `}</style>
    </section>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
function Kpi({
  icon,
  label,
  value,
  tone = "blue",
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber";
  compact?: boolean;
}) {
  const c = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40",
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-4 inline-flex rounded-xl p-2 ${c}`}>{icon}</div>
      <div
        className={`${compact ? "text-xl" : "text-3xl"} font-bold tracking-tight text-slate-950 dark:text-white`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-5 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
        {icon}
        {title}
      </h3>
      {children}
    </article>
  );
}
function CompareCard({
  title,
  item,
  changeQtd,
  changeValue,
}: {
  title: string;
  item: Pick<Compare, "quantidade" | "aprovadas" | "valor_aprovado">;
  changeQtd?: string;
  changeValue?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold">
        {integer(item.quantidade)}{" "}
        <span className="text-xs font-normal text-slate-500">propostas</span>{" "}
        {changeQtd && <Change value={changeQtd} />}
      </p>
      <p className="mt-2 text-sm">
        {integer(item.aprovadas)} aprovadas · {money(item.valor_aprovado)}{" "}
        {changeValue && <Change value={changeValue} />}
      </p>
    </div>
  );
}
function Change({ value }: { value: string }) {
  const good = !value.startsWith("-");
  return (
    <span
      className={`ml-1 text-xs font-bold ${good ? "text-emerald-600" : "text-red-600"}`}
    >
      {value}
    </span>
  );
}

function ApprovalByType({ rows }: { rows: Data["aprovacaoPorTipo"] }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-slate-500">
        Sem dados por tipo para o filtro selecionado.
      </p>
    );
  }

  return (
    <div className="space-y-3" role="list">
      {rows.map((item) => {
        const taxa = Math.max(
          0,
          Math.min(100, Number(item.taxa_aprovacao || 0)),
        );

        return (
          <div
            key={item.nome}
            role="listitem"
            className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{item.nome}</p>
                <p className="text-xs text-slate-500">
                  {integer(item.aprovadas)} aprovadas de {integer(item.total)}
                  {" · "}
                  {money(item.valor_aprovado)}
                </p>
              </div>

              <strong className="text-emerald-600">
                {taxa.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
                %
              </strong>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${taxa}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBars({
  rows,
  metric = "quantidade",
  color,
}: {
  rows: Row[];
  metric?: "quantidade" | "valor";
  color?: string;
}) {
  const values = rows.map((x) =>
    metric === "valor" ? Number(x.valor) : Number(x.quantidade),
  );
  const max = Math.max(1, ...values);
  return (
    <div className="space-y-3" role="list">
      {rows.length ? (
        rows.map((x, i) => {
          const n = values[i];
          return (
            <div key={`${x.nome}-${i}`} role="listitem">
              <div className="mb-1 flex justify-between gap-3 text-xs">
                <span className="truncate font-medium" title={x.nome}>
                  {x.nome}
                </span>
                <b>{metric === "valor" ? money(n) : integer(n)}</b>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (n / max) * 100)}%`,
                    backgroundColor: color || colors[i % colors.length],
                  }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-slate-500">
          Sem dados para o filtro selecionado.
        </p>
      )}
    </div>
  );
}
function SeriesChart({ rows }: { rows: Data["serie"] }) {
  const maxQ = Math.max(1, ...rows.map((x) => Number(x.quantidade)));
  const maxV = Math.max(1, ...rows.map((x) => Number(x.valor_aprovado)));

  const width = 960;
  const height = 190;
  const chartTop = 15;
  const chartBottom = 150;
  const slot = width / Math.max(rows.length, 1);

  const points = rows
    .map((item, index) => {
      const x = slot * index + slot / 2;
      const y =
        chartBottom -
        (Number(item.valor_aprovado) / maxV) * (chartBottom - chartTop);

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-600" />
          Quantidade de propostas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-5 bg-emerald-600" />
          Valor aprovado
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="relative min-w-[960px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-56 w-full"
            role="img"
            aria-label="Quantidade de propostas em barras e valor aprovado em linha nos últimos 12 meses"
            preserveAspectRatio="none"
          >
            {[0, 1, 2, 3].map((line) => {
              const y = chartTop + ((chartBottom - chartTop) / 3) * line;

              return (
                <line
                  key={line}
                  x1="0"
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {rows.map((item, index) => {
              const barHeight =
                (Number(item.quantidade) / maxQ) * (chartBottom - chartTop);

              const x = slot * index + slot / 2;
              const barWidth = Math.min(30, slot * 0.38);

              return (
                <rect
                  key={`bar-${item.mes}`}
                  x={x - barWidth / 2}
                  y={chartBottom - barHeight}
                  width={barWidth}
                  height={Math.max(3, barHeight)}
                  rx="4"
                  fill="#2563eb"
                >
                  <title>
                    {item.mes}: {integer(item.quantidade)} propostas
                  </title>
                </rect>
              );
            })}

            <polyline
              points={points}
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {rows.map((item, index) => {
              const x = slot * index + slot / 2;
              const y =
                chartBottom -
                (Number(item.valor_aprovado) / maxV) * (chartBottom - chartTop);

              return (
                <circle
                  key={`point-${item.mes}`}
                  cx={x}
                  cy={y}
                  r="5"
                  fill="#059669"
                  stroke="white"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>
                    {item.mes}: {money(item.valor_aprovado)}
                  </title>
                </circle>
              );
            })}

            {rows.map((item, index) => (
              <text
                key={`label-${item.mes}`}
                x={slot * index + slot / 2}
                y="178"
                textAnchor="middle"
                fill="currentColor"
                opacity="0.65"
                fontSize="11"
              >
                {item.mes}
              </text>
            ))}
          </svg>
        </div>
      </div>

      <table className="sr-only">
        <caption>Desempenho mensal dos últimos 12 meses</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Propostas</th>
            <th>Valor aprovado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.mes}>
              <td>{item.mes}</td>
              <td>{item.quantidade}</td>
              <td>{money(item.valor_aprovado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
