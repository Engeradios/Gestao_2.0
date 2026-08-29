"use client";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileText,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Proposal = {
  id: number;
  numero: string;
  clienteNome?: string;
  clienteCodigo?: string;
  status?: string;
  faseNegociacao?: string;
  representanteNome?: string;
  dataCadastro?: string;
  tipo?: string;
  local?: string;
  clienteUf?: string;
  valProposta?: string;
  titulo?: string;
  contatoNome?: string;
  contatoEmail?: string;
  contatoCelular?: string;
  enderecoInstalacao?: string;
  contrato?: string;
  evolucoes?: Array<{
    id: number;
    campo: string;
    valorAntigo?: string;
    valorNovo?: string;
    origem?: string;
    usuario?: string;
    registradoEm?: string;
  }>;
};
type Listing = {
  itens: Proposal[];
  paginacao: { pagina: number; limite: number; total: number; paginas: number };
};
type Filters = {
  status: string[];
  fases: string[];
  representantes: string[];
  locais: string[];
  ufs: string[];
  tipos: string[];
};
type Panel = {
  resumo: {
    total: number;
    aprovadas: number;
    perdidas: number;
    canceladas: number;
    valor_total: string;
    valor_aprovado: string;
  };
  inativas: { quantidade: number };
  diasInatividade: number;
};
const empty: Listing = {
  itens: [],
  paginacao: { pagina: 1, limite: 25, total: 0, paginas: 1 },
};
const money = (v: unknown) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const date = (v?: string) =>
  v ? new Date(v).toLocaleDateString("pt-BR") : "-";

type Query = { busca: string; status: string; fase: string; representante: string; uf: string; tipo: string; pagina: number; limite: number };
export function ProposalsManager() {
  const [data, setData] = useState<Listing>(empty);
  const [filters, setFilters] = useState<Filters>({
    status: [],
    fases: [],
    representantes: [],
    locais: [],
    ufs: [],
    tipos: [],
  });
  const [panel, setPanel] = useState<Panel | null>(null);
  const [detail, setDetail] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timerRef = useRef<number | null>(null);
  const [q, setQ] = useState<Query>({
    busca: "",
    status: "",
    fase: "",
    representante: "",
    uf: "",
    tipo: "",
    pagina: 1,
    limite: 25,
  });
  const load = useCallback(
    async (n = q) => {
      setLoading(true);
      setError("");
      const p = new URLSearchParams();
      Object.entries(n).forEach(([k, v]) => v !== "" && p.set(k, String(v)));
      const r = await fetch(`/api/propostas?${p}`, { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) {
        setError(b.message || "Erro ao carregar propostas");
        setLoading(false);
        return;
      }
      setData(b);
      setLoading(false);
    },
    [q],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void Promise.all([
      load(),
      fetch("/api/propostas/filtros")
        .then((r) => r.json())
        .then(setFilters),
      fetch("/api/propostas/painel")
        .then((r) => r.json())
        .then(setPanel),
    ]), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  function change(k: string, v: string) {
    const n = { ...q, [k]: v, pagina: 1 };
    setQ(n);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void load(n), 250);
  }
  function page(pagina: number) {
    const n = { ...q, pagina };
    setQ(n);
    void load(n);
  }
  async function open(numero: string) {
    const r = await fetch(`/api/propostas/${encodeURIComponent(numero)}`);
    const b = await r.json();
    if (r.ok) setDetail(b);
    else setError(b.message || "Erro ao abrir proposta");
  }
  const cards = [
    { label: "Total", value: panel?.resumo.total || 0, Icon: FileText },
    {
      label: "Aprovadas",
      value: panel?.resumo.aprovadas || 0,
      Icon: CheckCircle2,
    },
    { label: "Perdidas", value: panel?.resumo.perdidas || 0, Icon: Ban },
    {
      label: "Valor aprovado",
      value: money(panel?.resumo.valor_aprovado),
      Icon: CircleDollarSign,
    },
    {
      label: `Inativas +${panel?.diasInatividade || 90}d`,
      value: panel?.inativas.quantidade || 0,
      Icon: Ban,
    },
  ];
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-medium text-red-600">Comercial</p>
        <h2 className="text-2xl font-bold">Propostas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Painel e consulta das propostas sincronizadas do Eloca.
        </p>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-950/40">
                <Icon size={19} />
              </span>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold">
                  {typeof value === "number"
                    ? value.toLocaleString("pt-BR")
                    : value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-4 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-950">
        <label className="relative xl:col-span-2">
          <Search className="absolute left-3 top-3 text-slate-400" size={17} />
          <input
            value={q.busca}
            onChange={(e) => change("busca", e.target.value)}
            placeholder="Número, cliente, título, contato..."
            className="w-full rounded-xl border bg-transparent py-2.5 pl-10 pr-3 dark:border-slate-700"
          />
        </label>
        {(
          [
            ["status", filters.status],
            ["fase", filters.fases],
            ["representante", filters.representantes],
            ["tipo", filters.tipos],
          ] as Array<[keyof Query, string[]]>
        ).map(([key, values]) => (
          <select
            key={key}
            value={String(q[key])}
            onChange={(e) => change(key, e.target.value)}
            className="rounded-xl border bg-transparent px-3 py-2.5 dark:border-slate-700"
          >
            <option value="">Todos</option>
            {values.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
      </div>
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                {[
                  "Proposta",
                  "Cliente",
                  "Status / fase",
                  "Representante",
                  "Tipo",
                  "Valor",
                  "Cadastro",
                  "",
                ].map((x) => (
                  <th key={x} className="px-4 py-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    Carregando...
                  </td>
                </tr>
              ) : data.itens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              ) : (
                data.itens.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {p.numero}
                      <p className="text-xs text-slate-500">{p.local}</p>
                    </td>
                    <td className="px-4 py-3">
                      {p.clienteNome || "-"}
                      <p className="text-xs text-slate-500">
                        {p.clienteCodigo} · {p.clienteUf}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {p.status || "-"}
                      <p className="text-xs text-slate-500">
                        {p.faseNegociacao || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{p.representanteNome || "-"}</td>
                    <td className="px-4 py-3">{p.tipo || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {money(p.valProposta)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {date(p.dataCadastro)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void open(p.numero)}
                        className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label={`Abrir proposta ${p.numero}`}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t p-4 text-sm dark:border-slate-800">
          <span>
            {data.paginacao.total.toLocaleString("pt-BR")} registros · Página{" "}
            {data.paginacao.pagina} de {data.paginacao.paginas}
          </span>
          <div className="flex gap-2">
            <button
              disabled={data.paginacao.pagina <= 1}
              onClick={() => page(data.paginacao.pagina - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              disabled={data.paginacao.pagina >= data.paginacao.paginas}
              onClick={() => page(data.paginacao.pagina + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
      {detail && (
        <ProposalDetail proposal={detail} onClose={() => setDetail(null)} />
      )}{" "}
    </section>
  );
}
function ProposalDetail({
  proposal,
  onClose,
}: {
  proposal: Proposal;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <header className="sticky top-0 flex justify-between border-b bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <p className="text-sm font-medium text-red-600">
              Detalhes da proposta
            </p>
            <h3 className="text-xl font-bold">Proposta {proposal.numero}</h3>
            <p className="text-sm text-slate-500">{proposal.clienteNome}</p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="space-y-5 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Status", proposal.status],
              ["Fase", proposal.faseNegociacao],
              ["Valor", money(proposal.valProposta)],
              ["Representante", proposal.representanteNome],
              ["Tipo", proposal.tipo],
              ["Cadastro", date(proposal.dataCadastro)],
              ["Contrato", proposal.contrato],
              ["Contato", proposal.contatoNome],
              ["E-mail", proposal.contatoEmail],
              ["Celular", proposal.contatoCelular],
              ["Instalação", proposal.enderecoInstalacao],
              ["Título", proposal.titulo],
            ].map(([l, v]) => (
              <div
                key={l}
                className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"
              >
                <p className="text-xs uppercase text-slate-500">{l}</p>
                <p className="mt-1 break-words text-sm font-medium">
                  {v || "-"}
                </p>
              </div>
            ))}
          </div>
          <section className="rounded-2xl border p-4 dark:border-slate-800">
            <h4 className="mb-3 font-semibold">Evolução</h4>
            {!proposal.evolucoes?.length ? (
              <p className="text-sm text-slate-500">
                Nenhuma evolução registrada.
              </p>
            ) : (
              <div className="space-y-2">
                {proposal.evolucoes.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"
                  >
                    <b>{e.campo}</b>: {e.valorAntigo || "-"} →{" "}
                    {e.valorNovo || "-"}
                    <p className="text-xs text-slate-500">
                      {e.usuario || "-"} · {e.origem || "-"} ·{" "}
                      {e.registradoEm
                        ? new Date(e.registradoEm).toLocaleString("pt-BR")
                        : "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
