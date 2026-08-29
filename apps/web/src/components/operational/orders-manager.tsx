"use client";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Eye,
  ClipboardList,
  Users,
  Clock3,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
type Order = {
  id: string;
  numero: string;
  clienteNome?: string;
  clienteCodigo?: string;
  local?: string;
  uf?: string;
  tipo?: string;
  situacao?: string;
  status?: string;
  contrato?: string;
  tecnico?: string;
  abertura?: string;
  fechamento?: string;
  equipamento?: string;
  produto?: string;
  [key: string]: unknown;
};
type Data = {
  dados: Order[];
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
};
type Filters = {
  status: (string | null)[];
  situacoes: (string | null)[];
  tipos: (string | null)[];
  ufs: (string | null)[];
};
type Indicators = {
  total: number;
  abertas: number;
  fechadas: number;
  canceladas: number;
  clientes: number;
  ultimaSincronizacao?: string;
};
const empty: Data = {
  dados: [],
  paginacao: { pagina: 1, limite: 25, total: 0, totalPaginas: 1 },
};
export function OrdersManager() {
  const [data, setData] = useState<Data>(empty);
  const [filters, setFilters] = useState<Filters>({
    status: [],
    situacoes: [],
    tipos: [],
    ufs: [],
  });
  const [ind, setInd] = useState<Indicators>({
    total: 0,
    abertas: 0,
    fechadas: 0,
    canceladas: 0,
    clientes: 0,
  });
  const [q, setQ] = useState({
    busca: "",
    status: "",
    situacao: "",
    tipo: "",
    uf: "",
    pagina: 1,
    limite: 25,
  });
  const [detail, setDetail] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(
    async (n = q) => {
      setLoading(true);
      const p = new URLSearchParams();
      Object.entries(n).forEach(([k, v]) => v !== "" && p.set(k, String(v)));
      const r = await fetch(`/api/operacional/os?${p}`, { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) {
        setError(b.message ?? "Erro ao carregar");
        setLoading(false);
        return;
      }
      setData(b);
      setLoading(false);
    },
    [q],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        load(),
        fetch("/api/operacional/os/filtros")
          .then((r) => r.json())
          .then(setFilters),
        fetch("/api/operacional/os/indicadores")
          .then((r) => r.json())
          .then(setInd),
      ]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  function change(k: string, v: string) {
    const n = { ...q, [k]: v, pagina: 1 };
    setQ(n);
    window.clearTimeout(
      (window as unknown as { orderTimer?: number }).orderTimer,
    );
    (window as unknown as { orderTimer?: number }).orderTimer =
      window.setTimeout(() => void load(n), 250);
  }
  async function open(id: string) {
    const r = await fetch(`/api/operacional/os/${id}`);
    const b = await r.json();
    if (r.ok) setDetail(b);
  }
  function page(pagina: number) {
    const n = { ...q, pagina };
    setQ(n);
    void load(n);
  }
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-medium text-red-600">Operacional</p>
        <h2 className="text-2xl font-bold">Ordens de Serviço</h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta integrada das OS sincronizadas do sistema legado.
        </p>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { Icon: ClipboardList, label: "Total", value: ind.total },
          { Icon: Clock3, label: "Abertas", value: ind.abertas },
          { Icon: CheckCircle2, label: "Fechadas", value: ind.fechadas },
          { Icon: Ban, label: "Canceladas", value: ind.canceladas },
          { Icon: Users, label: "Clientes", value: ind.clientes },
        ].map(({ Icon, label, value }) => (
          <div
            key={String(label)}
            className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-950/40">
                <Icon size={19} />
              </span>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold">
                  {Number(value).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-4 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-5 dark:border-slate-800 dark:bg-slate-950">
        <label className="relative xl:col-span-2">
          <Search className="absolute left-3 top-3 text-slate-400" size={17} />
          <input
            value={q.busca}
            onChange={(e) => change("busca", e.target.value)}
            placeholder="OS, cliente, contrato, técnico..."
            className="w-full rounded-xl border bg-transparent py-2.5 pl-10 pr-3 dark:border-slate-700"
          />
        </label>
        {[
          ["status", filters.status],
          ["situacao", filters.situacoes],
          ["tipo", filters.tipos],
        ].map(([key, values]) => (
          <select
            key={key as string}
            value={q[key as keyof typeof q]}
            onChange={(e) => change(key as string, e.target.value)}
            className="rounded-xl border bg-transparent px-3 py-2.5 dark:border-slate-700"
          >
            <option value="">Todos</option>
            {(values as (string | null)[]).filter(Boolean).map((v) => (
              <option key={v!}>{v}</option>
            ))}
          </select>
        ))}
      </div>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                {[
                  "OS",
                  "Cliente",
                  "Tipo / situação",
                  "Contrato",
                  "Técnico",
                  "Abertura",
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
                  <td colSpan={7} className="p-8 text-center">
                    Carregando...
                  </td>
                </tr>
              ) : (
                data.dados.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {o.numero}
                      <p className="text-xs text-slate-500">{o.local}</p>
                    </td>
                    <td className="px-4 py-3">
                      {o.clienteNome}
                      <p className="text-xs text-slate-500">
                        {o.clienteCodigo}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {o.tipo}
                      <p className="text-xs text-slate-500">
                        {o.status} · {o.situacao}
                      </p>
                    </td>
                    <td className="px-4 py-3">{o.contrato || "-"}</td>
                    <td className="px-4 py-3">{o.tecnico || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {o.abertura
                        ? new Date(o.abertura).toLocaleString("pt-BR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void open(o.id)}
                        className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
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
            {data.paginacao.pagina} de {data.paginacao.totalPaginas}
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
              disabled={data.paginacao.pagina >= data.paginacao.totalPaginas}
              onClick={() => page(data.paginacao.pagina + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
      {detail && <OrderDetail order={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}

function OrderDetail({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const equipments = Array.isArray(order.equipamentos)
    ? (order.equipamentos as Record<string, unknown>[])
    : [];
  const client =
    order.cliente && typeof order.cliente === "object"
      ? (order.cliente as Record<string, unknown>)
      : null;
  const value = (v: unknown) =>
    v === null || v === undefined || v === "" ? "-" : String(v);
  const date = (v: unknown) =>
    v ? new Date(String(v)).toLocaleString("pt-BR") : "-";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <header className="sticky top-0 z-10 flex justify-between border-b bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <p className="text-sm font-medium text-red-600">
              Detalhes da ordem
            </p>
            <h3 className="text-xl font-bold">OS {order.numero}</h3>
            <p className="text-sm text-slate-500">{value(order.clienteNome)}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </header>
        <div className="space-y-5 p-5">
          <DetailSection title="Atendimento">
            <Detail label="Status" value={value(order.status)} />
            <Detail label="Situação" value={value(order.situacao)} />
            <Detail label="Tipo" value={value(order.tipo)} />
            <Detail label="Técnico" value={value(order.tecnico)} />
            <Detail label="Solicitante" value={value(order.solicitante)} />
            <Detail label="Atendente" value={value(order.atendente)} />
          </DetailSection>
          <DetailSection title="Cliente e local">
            <Detail label="Razão social" value={value(order.clienteNome)} />
            <Detail label="Código" value={value(order.clienteCodigo)} />
            <Detail label="CNPJ" value={value(client?.cnpj)} />
            <Detail label="Telefone" value={value(order.telefone)} />
            <Detail
              label="Município / UF"
              value={`${value(client?.municipio)} / ${value(order.uf)}`}
            />
            <Detail
              label="Endereço da obra"
              value={value(order.enderecoObra)}
            />
          </DetailSection>
          <DetailSection title="Contrato">
            <Detail label="Contrato" value={value(order.contrato)} />
            <Detail label="Tipo" value={value(order.tipoContrato)} />
            <Detail label="Situação" value={value(order.situacaoContrato)} />
            <Detail label="Pedido" value={value(order.pedido)} />
            <Detail label="Fatura" value={value(order.fatura)} />
            <Detail label="Título" value={value(order.titulo)} />
          </DetailSection>
          <DetailSection title="Execução">
            <Detail label="Abertura" value={date(order.abertura)} />
            <Detail label="Fechamento" value={date(order.fechamento)} />
            <Detail
              label="Início da execução"
              value={date(order.inicioExecucao)}
            />
            <Detail label="Fim da execução" value={date(order.fimExecucao)} />
            <Detail label="Prazo de entrega" value={date(order.prazoEntrega)} />
            <Detail label="Conclusão" value={value(order.conclusao)} />
          </DetailSection>
          <section className="rounded-2xl border p-4 dark:border-slate-800">
            <h4 className="mb-3 font-semibold">
              Equipamentos e acessórios ({equipments.length})
            </h4>
            {equipments.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum equipamento estruturado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Descrição</th>
                      <th className="py-2 pr-3">Número interno</th>
                      <th className="py-2 pr-3">Fabricante</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800">
                    {equipments.map((e, i) => (
                      <tr key={String(e.id ?? i)}>
                        <td className="py-2 pr-3">{value(e.tipo)}</td>
                        <td className="py-2 pr-3">{value(e.descricao)}</td>
                        <td className="py-2 pr-3">{value(e.numeroInterno)}</td>
                        <td className="py-2 pr-3">
                          {value(e.numeroFabricante)}
                        </td>
                        <td className="py-2">{value(e.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <DetailSection title="Aceite">
            <Detail label="Responsável" value={value(order.aceiteNome)} />
            <Detail label="Cargo" value={value(order.aceiteCargo)} />
            <Detail label="Setor" value={value(order.aceiteSetor)} />
            <Detail label="Documento" value={value(order.aceiteDocumento)} />
            <Detail label="Data" value={date(order.aceiteEm)} />
            <Detail
              label="Aprovado"
              value={
                order.aceiteAprovado === true
                  ? "Sim"
                  : order.aceiteAprovado === false
                    ? "Não"
                    : "-"
              }
            />
          </DetailSection>
          <DetailSection title="Sincronização">
            <Detail label="Origem" value={value(order.origem)} />
            <Detail label="ID legado" value={value(order.origemId)} />
            <Detail
              label="Última sincronização"
              value={date(order.sincronizadoEm)}
            />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border p-4 dark:border-slate-800">
      <h4 className="mb-3 font-semibold">{title}</h4>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
