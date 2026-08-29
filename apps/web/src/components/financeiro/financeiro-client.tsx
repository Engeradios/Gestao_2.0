"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
type Mode =
  | "dashboard"
  | "receber"
  | "pagar"
  | "fluxo"
  | "dre"
  | "plano-contas"
  | "notas-recebidas"
  | "importacoes";
type Row = Record<string, unknown>;
const nav = [
  ["Visão geral", "/financeiro"],
  ["Contas a receber", "/financeiro/receber"],
  ["Contas a pagar", "/financeiro/pagar"],
  ["Fluxo", "/financeiro/fluxo"],
  ["DRE", "/financeiro/dre"],
  ["Plano de contas", "/financeiro/plano-contas"],
  ["NF recebidas", "/financeiro/notas-recebidas"],
  ["Importações", "/financeiro/importacoes"],
];
const label: Record<string, string> = {
  id: "ID",
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  descricao: "Descrição",
  documento: "Documento",
  filial: "Filial",
  situacao: "Situação",
  valor: "Valor",
  valor_pago: "Valor pago",
  valor_devido: "Valor devido",
  valor_recebido: "Valor recebido",
  data_vencto: "Vencimento",
  data_vencimento: "Vencimento",
  data_pagamento: "Pagamento",
  chave_titulo: "Título",
  codigo: "Código",
  nome: "Nome",
  natureza: "Natureza",
  grupo_dre: "Grupo DRE",
  setor: "Setor",
  numero: "Número",
  emit_nome: "Emitente",
  emit_cnpj: "CNPJ",
  valor_total: "Total",
  data_emissao: "Emissão",
  origem_tabela: "Origem",
  importado_em: "Importado em",
};
const money = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v ?? 0),
  );
const fmt = (k: string, v: unknown) =>
  k.startsWith("valor") || ["total", "receber", "pagar", "notas"].includes(k)
    ? money(v)
    : k.startsWith("data_") || k.endsWith("_em")
      ? v
        ? new Date(String(v)).toLocaleDateString("pt-BR")
        : ""
      : typeof v === "boolean"
        ? v
          ? "Sim"
          : "Não"
        : String(v ?? "");
const conf: Record<
  Mode,
  { title: string; subtitle: string; endpoint: string; cols: string[] }
> = {
  dashboard: {
    title: "Financeiro",
    subtitle: "Visão consolidada de títulos, pagamentos e notas.",
    endpoint: "dashboard",
    cols: [],
  },
  receber: {
    title: "Contas a receber",
    subtitle: "Acompanhamento de títulos, vencimentos e recebimentos.",
    endpoint: "receber",
    cols: [
      "cliente",
      "documento",
      "filial",
      "data_vencto",
      "valor_devido",
      "valor_recebido",
      "situacao",
    ],
  },
  pagar: {
    title: "Contas a pagar",
    subtitle: "Obrigações, vencimentos, classificação e baixas.",
    endpoint: "pagar",
    cols: [
      "fornecedor",
      "descricao",
      "documento",
      "data_vencimento",
      "valor",
      "valor_pago",
      "situacao",
    ],
  },
  fluxo: {
    title: "Fluxo financeiro",
    subtitle: "Entradas, saídas e saldos por período.",
    endpoint: "fluxo",
    cols: [],
  },
  dre: {
    title: "DRE",
    subtitle: "Resultado financeiro agrupado conforme o plano de contas.",
    endpoint: "dre",
    cols: [],
  },
  "plano-contas": {
    title: "Plano de contas",
    subtitle: "Contas organizadas por natureza, grupo e setor.",
    endpoint: "dre/contas",
    cols: ["codigo", "nome", "natureza", "grupo_dre", "setor", "ativo"],
  },
  "notas-recebidas": {
    title: "Notas fiscais recebidas",
    subtitle: "Notas, emitentes, valores e integração com Contas a Pagar.",
    endpoint: "notas-recebidas",
    cols: [
      "numero",
      "emit_nome",
      "emit_cnpj",
      "data_emissao",
      "valor_total",
      "situacao",
      "enviado_pagar",
    ],
  },
  importacoes: {
    title: "Importações financeiras",
    subtitle: "Histórico de cargas e resultados processados.",
    endpoint: "importacoes",
    cols: [
      "origem_tabela",
      "origem",
      "total_linhas",
      "novas",
      "atualizadas",
      "erros",
      "importado_em",
    ],
  },
};

interface AggregateData {
  _count?: number;
  _sum?: Record<string, number | null>;
  length?: number;
}

interface FinanceiroData {
  itens?: Row[];
  receber?: AggregateData;
  pagar?: AggregateData;
  notas?: AggregateData;
  grupos?: Record<string, unknown>;
  total?: unknown;
  saldos?: unknown[];
}

async function request(path: string, init?: RequestInit) {
  const r = await fetch(`/api/financeiro/${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await r.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!r.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Erro HTTP ${r.status}`;

    throw new Error(message);
  }
  return body;
}
export function FinanceiroClient({ mode }: { mode: Mode }) {
  const c = conf[mode];
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("");
  const [filial, setFilial] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries({
        busca,
        situacao,
        filial,
        inicio,
        fim,
      }))
        if (v) p.set(k, v);
      setData(await request(`${c.endpoint}${p.toString() ? `?${p}` : ""}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, [c.endpoint, busca, situacao, filial, inicio, fim]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);
  const rows: Row[] = useMemo(() => {
    if (Array.isArray(data)) return data as Row[];

    if (
      typeof data === "object" &&
      data !== null &&
      "itens" in data &&
      Array.isArray(data.itens)
    ) {
      return data.itens as Row[];
    }

    return [];
  }, [data]);

  const summaryData: FinanceiroData | null =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as FinanceiroData)
      : null;
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
          Módulo Financeiro
        </p>
        <h1 className="mt-1 text-2xl font-bold">{c.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{c.subtitle}</p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {nav.map(([n, h]) => (
            <Link
              key={h}
              href={h}
              className="rounded-full border px-3 py-1.5 text-sm hover:border-red-500 hover:text-red-600"
            >
              {n}
            </Link>
          ))}
        </nav>
      </header>
      {mode !== "dashboard" && mode !== "dre" && mode !== "fluxo" && (
        <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-5 dark:bg-slate-950">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar"
            className="rounded-lg border px-3 py-2"
          />
          <input
            value={filial}
            onChange={(e) => setFilial(e.target.value)}
            placeholder="Filial"
            className="rounded-lg border px-3 py-2"
          />
          <input
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
            placeholder="Situação"
            className="rounded-lg border px-3 py-2"
          />
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="rounded-lg border px-3 py-2"
          />
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="rounded-lg border px-3 py-2"
          />
        </section>
      )}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="rounded-xl border p-8 text-center">Carregando...</div>
      ) : mode === "dashboard" ? (
        <Dashboard data={summaryData} />
      ) : mode === "dre" ? (
        <Dre data={summaryData} />
      ) : mode === "fluxo" ? (
        <Flow data={summaryData} />
      ) : (
        <Table rows={rows} cols={c.cols} />
      )}
    </div>
  );
}
function Dashboard({ data }: { data: FinanceiroData | null }) {
  const cards = [
    ["Títulos a receber", data?.receber?._count ?? 0],
    ["Valor a receber", data?.receber?._sum?.valor_devido ?? 0],
    ["Títulos a pagar", data?.pagar?._count ?? 0],
    ["Valor a pagar", data?.pagar?._sum?.valor ?? 0],
    ["Notas recebidas", data?.notas?._count ?? 0],
    ["Total das notas", data?.notas?._sum?.valor_total ?? 0],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map(([k, v], i) => (
        <div
          key={String(k)}
          className="rounded-2xl border bg-white p-5 dark:bg-slate-950"
        >
          <div className="text-sm text-slate-500">{k}</div>
          <div className="mt-2 text-2xl font-bold">
            {i % 2 ? money(v) : String(v)}
          </div>
        </div>
      ))}
    </div>
  );
}
function Dre({ data }: { data: FinanceiroData | null }) {
  return (
    <section className="rounded-2xl border bg-white p-5 dark:bg-slate-950">
      <div className="space-y-3">
        {Object.entries(data?.grupos ?? {}).map(([k, v]) => (
          <div key={k} className="flex justify-between border-b pb-2">
            <span>{k}</span>
            <b>{money(v)}</b>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-between text-lg">
        <b>Total</b>
        <b>{money(data?.total)}</b>
      </div>
    </section>
  );
}
function Flow({ data }: { data: FinanceiroData | null }) {
  const cards = [
    ["Saldos cadastrados", data?.saldos?.length ?? 0],
    ["Entradas", data?.receber?.length ?? 0],
    ["Saídas", data?.pagar?.length ?? 0],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map(([k, v]) => (
        <div
          key={String(k)}
          className="rounded-2xl border bg-white p-5 dark:bg-slate-950"
        >
          <div className="text-sm text-slate-500">{k}</div>
          <div className="mt-2 text-2xl font-bold">{String(v)}</div>
        </div>
      ))}
    </div>
  );
}
function Table({ rows, cols }: { rows: Row[]; cols: string[] }) {
  if (!rows.length)
    return (
      <div className="rounded-2xl border bg-white p-10 text-center text-slate-500 dark:bg-slate-950">
        Nenhum registro encontrado.
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-slate-950">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            {cols.map((k) => (
              <th key={k} className="whitespace-nowrap px-4 py-3 text-left">
                {label[k] ?? k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id ?? i)} className="border-t">
              {cols.map((k) => (
                <td key={k} className="whitespace-nowrap px-4 py-3">
                  {fmt(k, r[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
