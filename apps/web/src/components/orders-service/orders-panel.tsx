"use client";

// OS_PAINEL_FILTROS_ORDENACAO_DINAMICA
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SortField =
  | "numero"
  | "clienteNome"
  | "uf"
  | "tipo"
  | "situacao"
  | "tecnico"
  | "abertura";

type Direction = "asc" | "desc";

type Order = {
  id: string;
  numero: string;
  clienteNome?: string | null;
  uf?: string | null;
  tipo?: string | null;
  situacao?: string | null;
  tecnico?: string | null;
  abertura?: string | null;
  estado: string;
  classificacao?: string | null;
  horasUteis?: number | null;
};

type Response = {
  dados: Order[];
  paginacao: {
    pagina: number;
    limite?: number;
    total: number;
    totalPaginas: number;
  };
  escopo: string;
};

type FilterOptions = {
  status: Array<string | null>;
  situacoes: Array<string | null>;
  tipos: Array<string | null>;
  ufs: Array<string | null>;
};

type Query = {
  busca: string;
  status: string;
  situacao: string;
  tipo: string;
  uf: string;
  pagina: number;
  limite: number;
  ordenarPor: SortField;
  direcao: Direction;
};

const initialQuery: Query = {
  busca: "",
  status: "",
  situacao: "",
  tipo: "",
  uf: "",
  pagina: 1,
  limite: 25,
  ordenarPor: "abertura",
  direcao: "desc",
};

const emptyOptions: FilterOptions = {
  status: [],
  situacoes: [],
  tipos: [],
  ufs: [],
};

function messageOf(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(". ") : message;
  }

  return undefined;
}

function formatDate(value?: string | null) {
  if (!value) return "–";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "–";

  return date.toLocaleString("pt-BR");
}

export function OrdersPanel({
  endpoint,
  title,
}: {
  endpoint: string;
  title: string;
}) {
  const [data, setData] = useState<Response | null>(null);
  const [options, setOptions] = useState<FilterOptions>(emptyOptions);
  const [query, setQuery] = useState<Query>(initialQuery);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true);

    try {
      const response = await fetch("/api/operacional/os/filtros", {
        cache: "no-store",
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          messageOf(payload) ?? "Falha ao carregar filtros",
        );
      }

      setOptions(payload as FilterOptions);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao carregar filtros",
      );
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  const load = useCallback(
    async (current: Query) => {
      setLoading(true);
      setError("");

      try {
        const url = new URL(endpoint, window.location.origin);

        Object.entries(current).forEach(([key, value]) => {
          if (value !== "") {
            url.searchParams.set(key, String(value));
          }
        });

        const response = await fetch(
          `${url.pathname}${url.search}`,
          { cache: "no-store" },
        );
        const payload: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            messageOf(payload) ?? "Falha ao carregar painel",
          );
        }

        setData(payload as Response);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao carregar painel",
        );
      } finally {
        setLoading(false);
      }
    },
    [endpoint],
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => void loadFilters(),
      0,
    );

    return () => window.clearTimeout(timer);
  }, [loadFilters]);

  useEffect(() => {
    const delay = query.busca ? 350 : 0;
    const timer = window.setTimeout(
      () => void load(query),
      delay,
    );

    return () => window.clearTimeout(timer);
  }, [load, query, refreshToken]);

  function change(
    field: "busca" | "status" | "situacao" | "tipo" | "uf",
    value: string,
  ) {
    setQuery((current) => ({
      ...current,
      [field]: value,
      pagina: 1,
    }));
  }

  function sort(field: SortField) {
    setQuery((current) => ({
      ...current,
      ordenarPor: field,
      direcao:
        current.ordenarPor === field && current.direcao === "asc"
          ? "desc"
          : "asc",
      pagina: 1,
    }));
  }

  function clearFilters() {
    setQuery(initialQuery);
  }

  function page(value: number) {
    const last = data?.paginacao.totalPaginas ?? 1;
    const next = Math.min(Math.max(value, 1), last);

    setQuery((current) => ({
      ...current,
      pagina: next,
    }));
  }

  const hasFilters = Boolean(
    query.busca ||
      query.status ||
      query.situacao ||
      query.tipo ||
      query.uf,
  );

  const columns: Array<{
    label: string;
    field?: SortField;
  }> = [
    { label: "OS", field: "numero" },
    { label: "Cliente", field: "clienteNome" },
    { label: "UF", field: "uf" },
    { label: "Tipo", field: "tipo" },
    { label: "Situação", field: "situacao" },
    { label: "Técnico", field: "tecnico" },
    { label: "Abertura", field: "abertura" },
    { label: "Estado" },
    { label: "SLA" },
    { label: "Horas úteis" },
  ];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Ordens de Serviço
          </p>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-slate-500">
            {data?.paginacao.total ?? 0} registros
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshToken((value) => value + 1)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
      </header>

      <div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-950">
        <label className="relative xl:col-span-2">
          <span className="sr-only">Pesquisar ordens de serviço</span>
          <Search
            className="absolute left-3 top-3 text-slate-400"
            size={17}
          />
          <input
            value={query.busca}
            onChange={(event) =>
              change("busca", event.target.value)
            }
            placeholder="OS, cliente, contrato, técnico..."
            className="w-full rounded-xl border bg-transparent py-2.5 pl-10 pr-3 dark:border-slate-700"
          />
        </label>

        <FilterSelect
          label="Status"
          value={query.status}
          values={options.status}
          loading={loadingFilters}
          onChange={(value) => change("status", value)}
        />

        <FilterSelect
          label="Situação"
          value={query.situacao}
          values={options.situacoes}
          loading={loadingFilters}
          onChange={(value) => change("situacao", value)}
        />

        <FilterSelect
          label="Tipo"
          value={query.tipo}
          values={options.tipos}
          loading={loadingFilters}
          onChange={(value) => change("tipo", value)}
        />

        <FilterSelect
          label="UF"
          value={query.uf}
          values={options.ufs}
          loading={loadingFilters}
          onChange={(value) => change("uf", value)}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold xl:col-start-6"
          >
            <X size={16} />
            Limpar filtros
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <caption className="sr-only">
              Ordens de serviço. Use os botões dos cabeçalhos para
              ordenar as colunas.
            </caption>

            <thead className="bg-slate-50 text-left dark:bg-slate-900">
              <tr>
                {columns.map((column) => {
                  const active =
                    column.field === query.ordenarPor;
                  const ariaSort = active
                    ? query.direcao === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined;

                  return (
                    <th
                      key={column.label}
                      scope="col"
                      aria-sort={ariaSort}
                      className="p-3"
                    >
                      {column.field ? (
                        <button
                          type="button"
                          onClick={() => sort(column.field!)}
                          className="inline-flex w-full items-center gap-2 text-left font-semibold hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          {column.label}
                          <SortIcon
                            active={active}
                            direction={query.direcao}
                          />
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y dark:divide-slate-800">
              {loading && !data ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-10 text-center text-slate-500"
                  >
                    Carregando ordens de serviço...
                  </td>
                </tr>
              ) : (
                (data?.dados ?? []).map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  >
                    <td className="p-3 font-semibold">
                      {order.numero}
                    </td>
                    <td className="p-3">{order.clienteNome ?? "–"}</td>
                    <td className="p-3">{order.uf ?? "–"}</td>
                    <td className="p-3">{order.tipo ?? "–"}</td>
                    <td className="p-3">{order.situacao ?? "–"}</td>
                    <td className="p-3">{order.tecnico ?? "–"}</td>
                    <td className="whitespace-nowrap p-3">
                      {formatDate(order.abertura)}
                    </td>
                    <td className="p-3">{order.estado}</td>
                    <td className="p-3">
                      {order.classificacao ?? "Sem cálculo"}
                    </td>
                    <td className="p-3">
                      {order.horasUteis ?? "–"}
                    </td>
                  </tr>
                ))
              )}

              {!loading && !data?.dados.length && (
                <tr>
                  <td
                    colSpan={10}
                    className="p-10 text-center text-slate-500"
                  >
                    Nenhuma OS encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t p-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <span>
            Página {data?.paginacao.pagina ?? query.pagina} de{" "}
            {data?.paginacao.totalPaginas ?? 1}
          </span>

          <div className="flex items-center gap-2">
            <label>
              <span className="sr-only">Registros por página</span>
              <select
                value={query.limite}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    limite: Number(event.target.value),
                    pagina: 1,
                  }))
                }
                className="rounded-lg border bg-transparent px-3 py-2 dark:border-slate-700"
              >
                {[10, 25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value} por página
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              aria-label="Página anterior"
              disabled={
                loading || (data?.paginacao.pagina ?? 1) <= 1
              }
              onClick={() =>
                page((data?.paginacao.pagina ?? 1) - 1)
              }
              className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              aria-label="Próxima página"
              disabled={
                loading ||
                (data?.paginacao.pagina ?? 1) >=
                  (data?.paginacao.totalPaginas ?? 1)
              }
              onClick={() =>
                page((data?.paginacao.pagina ?? 1) + 1)
              }
              className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  values,
  loading,
  onChange,
}: {
  label: string;
  value: string;
  values: Array<string | null>;
  loading: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={loading}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border bg-transparent px-3 py-2.5 disabled:opacity-50 dark:border-slate-700"
      >
        <option value="">
          {loading ? "Carregando..." : `${label}: todos`}
        </option>

        {values.filter(Boolean).map((item) => (
          <option key={item!} value={item!}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: Direction;
}) {
  if (!active) {
    return <ArrowUpDown size={15} aria-hidden="true" />;
  }

  return direction === "asc" ? (
    <ArrowUp size={15} aria-hidden="true" />
  ) : (
    <ArrowDown size={15} aria-hidden="true" />
  );
}
