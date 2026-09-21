"use client";

import type { TvWidget, TvWidgetColor } from "@/lib/dashboard-tv-types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// DASHBOARD_TV_FASE2_1_RECHARTS
// DASHBOARD_TV_FASE5B_WIDGET_OPTIONS

type Row = Record<string, unknown>;

const ACCENTS: Record<TvWidgetColor, string> = {
  VERMELHO: "#ef4444",
  LARANJA: "#f59e0b",
  VERDE: "#22c55e",
  AZUL: "#38bdf8",
  ROXO: "#8b5cf6",
  ROSA: "#ec4899",
  CIANO: "#14b8a6",
};
const COLORS = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#38bdf8",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function number(value: unknown) {
  return Number(value || 0);
}

function formatted(value: unknown) {
  return number(value).toLocaleString("pt-BR");
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function EmptyChart() {
  return (
    <div className="grid h-full min-h-[180px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-[clamp(14px,1vw,18px)] text-slate-500">
      Sem dados para exibir
    </div>
  );
}

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: { label?: string; suffix?: string };
  }>;
};

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#111318]/95 px-4 py-3 shadow-2xl">
      <p className="max-w-64 truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {item.payload?.label || "Indicador"}
      </p>
      <strong className="mt-1 block text-lg text-white">
        {formatted(item.value)}
        {item.payload?.suffix || ""}
      </strong>
    </div>
  );
}

function HorizontalBars({
  data,
  valueKey = "quantidade",
  labelKey = "nome",
  suffix = "",
  limit = 8,
  accent,
}: {
  data: unknown;
  valueKey?: string;
  labelKey?: string;
  suffix?: string;
  limit?: number;
  accent?: string;
}) {
  const items = rows(data)
    .slice(0, limit)
    .map((item, index) => ({
      label: String(item[labelKey] || "Nao informado"),
      value: Math.abs(number(item[valueKey])),
      suffix,
      color: index === 0 && accent ? accent : COLORS[index % COLORS.length],
    }));
  if (!items.length) return <EmptyChart />;
  const longestLabel = Math.max(...items.map((item) => item.label.length));
  const yAxisWidth = Math.min(220, Math.max(78, longestLabel * 7.2));
  return (
    <div
      className="h-full min-h-[220px] w-full"
      role="img"
      aria-label="Grafico de barras horizontais"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minHeight={220}
        debounce={80}
      >
        <BarChart
          accessibilityLayer
          data={items}
          layout="vertical"
          margin={{ top: 8, right: 72, bottom: 8, left: 4 }}
          barCategoryGap="24%"
        >
          <CartesianGrid
            horizontal={false}
            stroke="rgba(148,163,184,.12)"
            strokeDasharray="4 6"
          />
          <XAxis
            type="number"
            hide
            domain={[0, "dataMax"]}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={yAxisWidth}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#cbd5e1", fontSize: 13, fontWeight: 650 }}
            tickFormatter={(value: string) =>
              value.length > 24 ? `${value.slice(0, 23)}...` : value
            }
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,.035)" }}
            content={<ChartTooltip />}
            isAnimationActive={false}
          />
          <Bar
            dataKey="value"
            radius={[0, 10, 10, 0]}
            minPointSize={4}
            isAnimationActive
            animationDuration={600}
          >
            {items.map((item) => (
              <Cell key={`${item.label}-${item.color}`} fill={item.color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              fill="#f8fafc"
              fontSize={14}
              fontWeight={800}
              formatter={(value: unknown) => `${formatted(value)}${suffix}`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// DASHBOARD_TV_FASE2_3_KPI
function Kpis({
  values,
}: {
  values: Array<{
    label: string;
    value: unknown;
    color?: string;
    progress?: number;
  }>;
}) {
  const columns = Math.max(1, Math.min(4, values.length));

  return (
    <div
      className="grid h-full min-h-0 gap-[clamp(12px,1.2vw,22px)]"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {values.map((item, index) => {
        const accent = item.color || COLORS[index % COLORS.length];
        const progress =
          item.progress === undefined
            ? undefined
            : Math.max(0, Math.min(100, item.progress));

        return (
          <article
            key={item.label}
            className="group relative flex min-h-[150px] min-w-0 flex-col justify-between overflow-hidden rounded-[clamp(16px,1.3vw,24px)] border border-white/10 bg-[linear-gradient(145deg,rgba(28,31,38,.92),rgba(10,12,16,.96))] p-[clamp(16px,1.35vw,26px)] shadow-[0_18px_45px_rgba(0,0,0,.25)]"
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background: `linear-gradient(90deg, ${accent}, transparent 88%)`,
              }}
            />
            <div
              className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-[0.09] blur-2xl"
              style={{ backgroundColor: accent }}
            />

            <div className="relative flex items-start justify-between gap-3">
              <p className="min-w-0 text-[clamp(11px,.76vw,15px)] font-extrabold uppercase leading-tight tracking-[0.13em] text-slate-400">
                {item.label}
              </p>
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_14px_currentColor]"
                style={{ backgroundColor: accent, color: accent }}
                aria-hidden="true"
              />
            </div>

            <strong
              className="relative my-[clamp(12px,1.5vh,22px)] block truncate text-[clamp(34px,3.15vw,62px)] font-black leading-none tracking-[-0.045em]"
              style={{ color: accent }}
              title={String(item.value ?? 0)}
            >
              {String(item.value ?? 0)}
            </strong>

            {progress !== undefined ? (
              <div className="relative">
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  <span>Progresso</span>
                  <span className="text-slate-300">
                    {progress.toLocaleString("pt-BR")}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-white/5">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                <span>Atual</span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

// DASHBOARD_TV_FASE2_2_DONUT
function Donut({
  value,
  label,
  color = "#ef4444",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const percentage = Math.max(0, Math.min(100, value));
  const chartData = [
    { name: label, value: percentage, color },
    {
      name: "Restante",
      value: Math.max(0, 100 - percentage),
      color: "#27303d",
    },
  ];
  return (
    <div className="grid h-full min-h-[230px] grid-cols-[minmax(170px,1fr)_minmax(150px,.8fr)] items-center gap-[clamp(18px,2.5vw,46px)]">
      <div
        className="relative h-full min-h-[220px] w-full"
        role="img"
        aria-label={`${label}: ${percentage.toLocaleString("pt-BR")}%`}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={220}
          debounce={80}
        >
          <PieChart accessibilityLayer>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="64%"
              outerRadius="88%"
              startAngle={90}
              endAngle={-270}
              cornerRadius={8}
              paddingAngle={percentage > 0 && percentage < 100 ? 2 : 0}
              stroke="transparent"
              isAnimationActive
              animationDuration={650}
            >
              {chartData.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <strong className="block text-[clamp(34px,3.2vw,62px)] font-black leading-none text-white">
              {percentage.toLocaleString("pt-BR")}%
            </strong>
            <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              indicador
            </span>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <span
          className="mb-4 block h-1 w-14 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="text-[clamp(14px,1vw,20px)] font-bold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <p className="mt-3 text-[clamp(17px,1.35vw,27px)] font-semibold leading-tight text-white">
          Indicador consolidado da operação
        </p>
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{percentage.toLocaleString("pt-BR")}% realizado</span>
        </div>
      </div>
    </div>
  );
}

export function TvWidgetView({
  widget,
  data,
}: {
  widget: TvWidget;
  data: unknown;
}) {
  const d =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const limit = Math.max(
    1,
    Math.min(20, Number(widget.configuracao.limite || 8)),
  );
  const accent =
    ACCENTS[
      (widget.configuracao.cor as TvWidgetColor | undefined) || "VERMELHO"
    ];

  if (widget.tipo === "operacional-resumo") {
    return (
      <Kpis
        values={[
          {
            label: "Em andamento",
            value: formatted(d.andamento),
            color: "#38bdf8",
          },
          {
            label: "Atrasados",
            value: formatted(d.atrasados),
            color: "#f59e0b",
          },
          {
            label: "Concluídos no mês",
            value: formatted(d.concluidos_mes),
            color: "#22c55e",
          },
          {
            label: "Progresso médio",
            value: `${formatted(d.progresso)}%`,
            color: "#8b5cf6",
            progress: number(d.progresso),
          },
        ]}
      />
    );
  }

  if (widget.tipo === "os-backlog") {
    return (
      <Kpis
        values={[
          {
            label: "Total histórico",
            value: formatted(d.total),
            color: "#38bdf8",
          },
          {
            label: "Em aberto",
            value: formatted(d.abertas),
            color: "#f59e0b",
          },
          {
            label: "Encerradas",
            value: formatted(d.encerradas),
            color: "#22c55e",
          },
          {
            label: "Laboratório",
            value: formatted(d.laboratorio_aguardando),
            color: "#ef4444",
          },
        ]}
      />
    );
  }

  if (widget.tipo === "propostas-resumo") {
    return (
      <div className="grid h-full gap-5 xl:grid-cols-[1.8fr_1fr]">
        <Kpis
          values={[
            {
              label: "Total",
              value: formatted(d.total),
              color: "#38bdf8",
            },
            {
              label: "Aprovadas",
              value: formatted(d.aprovadas),
              color: "#22c55e",
            },
            {
              label: "Aguardando",
              value: formatted(d.aguardando),
              color: "#f59e0b",
            },
          ]}
        />

        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-5">
          <Donut
            value={number(d.taxa)}
            label="Taxa de aprovação"
            color="#22c55e"
          />
        </div>
      </div>
    );
  }

  if (widget.tipo === "grandes-projetos-resumo") {
    return (
      <Kpis
        values={[
          {
            label: "Carteira",
            value: formatted(d.total),
            color: "#38bdf8",
          },
          {
            label: "Em execução",
            value: formatted(d.execucao),
            color: "#f59e0b",
          },
          {
            label: "Concluídos",
            value: formatted(d.concluidos),
            color: "#22c55e",
          },
          {
            label: "Planejamento",
            value: formatted(d.planejamento),
            color: "#8b5cf6",
          },
        ]}
      />
    );
  }

  if (widget.tipo === "financeiro-inadimplencia") {
    return (
      <div className="grid h-full gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Kpis
          values={[
            {
              label: "Títulos vencidos",
              value: formatted(d.vencidos),
              color: "#ef4444",
            },
            {
              label: "Títulos em aberto",
              value: formatted(d.abertos),
              color: "#f59e0b",
            },
          ]}
        />

        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-5">
          <Donut
            value={number(d.percentual_titulos)}
            label="Inadimplência"
            color="#ef4444"
          />
        </div>
      </div>
    );
  }

  if (widget.tipo === "os-distribuicao") {
    return (
      <div className="grid h-full gap-[clamp(18px,2vw,36px)] lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-[clamp(16px,1.5vw,28px)]">
          <h3 className="mb-5 text-[clamp(16px,1.2vw,24px)] font-bold text-slate-200">
            Distribuição por UF
          </h3>
          <HorizontalBars data={d.porUf} limit={limit} accent={accent} />
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-[clamp(16px,1.5vw,28px)]">
          <h3 className="mb-5 text-[clamp(16px,1.2vw,24px)] font-bold text-slate-200">
            Distribuição por tipo
          </h3>
          <HorizontalBars data={d.porTipo} limit={limit} accent={accent} />
        </div>
      </div>
    );
  }

  if (widget.tipo === "grandes-projetos-execucao") {
    return (
      <HorizontalBars
        data={data}
        valueKey="execucao"
        labelKey="nome"
        suffix="%"
        limit={limit}
        accent={accent}
      />
    );
  }

  if (widget.tipo === "operacional-alertas") {
    return (
      <HorizontalBars
        data={data}
        valueKey="dias"
        labelKey="cliente"
        suffix=" dias"
        limit={limit}
        accent={accent}
      />
    );
  }

  return <HorizontalBars data={data} limit={limit} accent={accent} />;
}
