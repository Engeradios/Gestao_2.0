"use client";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
type P = {
  id: number;
  numero: string;
  clienteNome?: string;
  clienteUf?: string;
  titulo?: string;
  tipo?: string;
  status?: string;
  faseNegociacao?: string;
  representanteNome?: string;
  dataCadastro?: string;
  previsaoFechamento?: string;
  dataInicio?: string;
  dataFim?: string;
  valProposta?: string;
  valProdutos?: string;
  valServicos?: string;
  valDesconto?: string;
  contrato?: string;
  local?: string;
  clienteMunicipio?: string;
  clienteTelefone?: string;
  contatoNome?: string;
  contatoEmail?: string;
  contatoCelular?: string;
  enderecoInstalacao?: string;
  motivo?: string;
  ultimaOrigem?: string;
  atualizadoEm?: string;
  evolucoes?: Evolution[];
};
type Evolution = { id: string | number; campo: string; origem?: string; registradoEm?: string; usuario?: string; valorAntigo?: string; valorNovo?: string };
type F = {
  status: string[];
  fases: string[];
  representantes: string[];
  tipos: string[];
};
const money = (v: unknown) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
type Query = { busca: string; status: string; fase: string; representante: string; tipo: string; pagina: number; limite: number; ordenar: string; direcao: string };
export function ProposalsPanel() {
  const [data, setData] = useState<{ itens: P[]; paginacao: { pagina: number; total: number; paginas: number } }>({
    itens: [],
    paginacao: { pagina: 1, total: 0, paginas: 1 },
  });
  const [filters, setFilters] = useState<F>({
    status: [],
    fases: [],
    representantes: [],
    tipos: [],
  });
  const [q, setQ] = useState<Query>({
    busca: "",
    status: "",
    fase: "",
    representante: "",
    tipo: "",
    pagina: 1,
    limite: 50,
    ordenar: "atualizado",
    direcao: "desc",
  });
  const [detail, setDetail] = useState<P | null>(null);
  const timerRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (n = q) => {
    setLoading(true);
    const u = new URLSearchParams();
    Object.entries(n).forEach(([k, v]) => v !== "" && u.set(k, String(v)));
    const r = await fetch(`/api/propostas?${u}`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, [q]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    void fetch("/api/propostas/filtros")
      .then((r) => r.json())
      .then(setFilters);
    return () => window.clearTimeout(timer);
  }, [load]);
  function change(k: string, v: unknown) {
    const n = { ...q, [k]: v, pagina: 1 };
    setQ(n);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void load(n), 250);
  }
  function sort(k: string) {
    const n = {
      ...q,
      ordenar: k,
      direcao: q.ordenar === k && q.direcao === "asc" ? "desc" : "asc",
      pagina: 1,
    };
    setQ(n);
    void load(n);
  }
  async function open(n: string) {
    const r = await fetch(`/api/propostas/${n}`);
    if (r.ok) setDetail(await r.json());
  }
  const cols = [
    ["numero", "Proposta"],
    ["cliente", "Cliente"],
    ["titulo", "Título"],
    ["tipo", "Tipo"],
    ["status", "Status"],
    ["fase", "Fase"],
    ["representante", "Representante"],
    ["uf", "UF"],
    ["criacao", "Criação"],
    ["valor", "Valor"],
  ];
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold text-red-600">Propostas</p>
        <h2 className="text-2xl font-bold">Painel</h2>
        <p className="text-sm text-slate-500">
          Filtros, paginação e ordenação crescente ou decrescente.
        </p>
      </div>
      <div className="mb-4 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-6 dark:bg-slate-950">
        <label className="relative xl:col-span-2">
          <Search className="absolute left-3 top-3" size={17} />
          <input
            value={q.busca}
            onChange={(e) => change("busca", e.target.value)}
            placeholder="Número, cliente, título..."
            className="w-full rounded-xl border bg-transparent py-2.5 pl-10"
          />
        </label>
        {(
          [
            ["status", filters.status],
            ["fase", filters.fases],
            ["representante", filters.representantes],
            ["tipo", filters.tipos],
          ] as Array<[keyof Query, string[]]>
        ).map(([k, vs]) => (
          <select
            key={k}
            value={q[k]}
            onChange={(e) => change(k, e.target.value)}
            className="rounded-xl border bg-transparent p-2"
          >
            <option value="">Todos</option>
            {vs.map((v: string) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase dark:bg-slate-900">
              <tr>
                {cols.map(([k, l]) => (
                  <th key={k} className="px-4 py-3 text-left">
                    <button onClick={() => sort(k)} className="flex gap-1">
                      {l}
                      {q.ordenar === k ? (
                        q.direcao === "asc" ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )
                      ) : null}
                    </button>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center">
                    Carregando...
                  </td>
                </tr>
              ) : (
                data.itens.map((p: P) => (
                  <tr key={p.id} className="border-t dark:border-slate-800">
                    <td className="px-4 py-3 font-bold">{p.numero}</td>
                    <td className="px-4">{p.clienteNome}</td>
                    <td className="max-w-64 px-4">
                      <span className="line-clamp-2">{p.titulo || "-"}</span>
                    </td>
                    <td className="px-4">{p.tipo || "-"}</td>
                    <td className="px-4">{p.status}</td>
                    <td className="px-4">{p.faseNegociacao || "-"}</td>
                    <td className="px-4">{p.representanteNome || "-"}</td>
                    <td className="px-4">{p.clienteUf || "-"}</td>
                    <td className="px-4">
                      {p.dataCadastro
                        ? new Date(p.dataCadastro).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="px-4 font-semibold">
                      {money(p.valProposta)}
                    </td>
                    <td className="px-4">
                      <button onClick={() => void open(p.numero)}>
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex justify-between border-t p-4 text-sm">
          <span>
            {data.paginacao.total} registros · Página {data.paginacao.pagina} de{" "}
            {data.paginacao.paginas}
          </span>
          <div className="flex gap-2">
            <select
              value={q.limite}
              onChange={(e) => change("limite", e.target.value)}
            >
              <option>10</option>
              <option>50</option>
              <option>100</option>
            </select>
            <button
              disabled={data.paginacao.pagina <= 1}
              onClick={() => change("pagina", data.paginacao.pagina - 1)}
            >
              <ChevronLeft />
            </button>
            <button
              disabled={data.paginacao.pagina >= data.paginacao.paginas}
              onClick={() => change("pagina", data.paginacao.pagina + 1)}
            >
              <ChevronRight />
            </button>
          </div>
        </footer>
      </div>
      {detail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b pb-4 dark:border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold">
                    Proposta {detail.numero}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    Número imutável
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Chave única utilizada nas importações e no histórico da
                  proposta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl border p-2 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                aria-label="Fechar"
              >
                <X />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Cliente", detail.clienteNome],
                ["Status", detail.status],
                ["Fase", detail.faseNegociacao],
                ["Tipo", detail.tipo],
                ["Representante", detail.representanteNome],
                [
                  "UF / Município",
                  [detail.clienteUf, detail.clienteMunicipio]
                    .filter(Boolean)
                    .join(" · "),
                ],
                [
                  "Cadastro",
                  detail.dataCadastro
                    ? new Date(detail.dataCadastro).toLocaleDateString("pt-BR")
                    : null,
                ],
                [
                  "Previsão de fechamento",
                  detail.previsaoFechamento
                    ? new Date(detail.previsaoFechamento).toLocaleDateString(
                        "pt-BR",
                      )
                    : null,
                ],
                ["Valor da proposta", money(detail.valProposta)],
                ["Produtos", money(detail.valProdutos)],
                ["Serviços", money(detail.valServicos)],
                ["Desconto", money(detail.valDesconto)],
                ["Contrato", detail.contrato],
                ["Local", detail.local],
                ["Contato", detail.contatoNome],
                ["Telefone", detail.contatoCelular || detail.clienteTelefone],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border p-3 dark:border-slate-800"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm font-medium">
                    {value || "-"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Título
                </p>
                <p className="mt-2 text-sm">{detail.titulo || "-"}</p>
              </div>
              <div className="rounded-xl border p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Endereço de instalação
                </p>
                <p className="mt-2 text-sm">
                  {detail.enderecoInstalacao || "-"}
                </p>
              </div>
            </div>

            <section className="mt-6">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold">
                    Evolução entre importações
                  </h4>
                  <p className="text-sm text-slate-500">
                    Alterações registradas para a mesma chave de proposta.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {detail.evolucoes?.length || 0} alteração(ões)
                </span>
              </div>
              {detail.evolucoes?.length ? (
                <div className="space-y-3">
                  {detail.evolucoes.map((e: Evolution) => (
                    <article
                      key={String(e.id)}
                      className="rounded-xl border p-4 dark:border-slate-800"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {e.campo}
                          </span>
                          <span className="text-xs text-slate-500">
                            {e.origem || "origem não informada"}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {e.registradoEm
                            ? new Date(e.registradoEm).toLocaleString("pt-BR")
                            : "-"}
                          {e.usuario ? ` · ${e.usuario}` : ""}
                        </span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-[1fr_30px_1fr]">
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Antes
                          </p>
                          <p className="mt-1 break-words text-sm">
                            {e.valorAntigo || "-"}
                          </p>
                        </div>
                        <div className="grid place-items-center text-slate-400">
                          →
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                          <p className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                            Depois
                          </p>
                          <p className="mt-1 break-words text-sm">
                            {e.valorNovo || "-"}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500 dark:border-slate-800">
                  Nenhuma alteração registrada para esta proposta. Importações
                  antigas podem não possuir vínculo detalhado.
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
