"use client";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Search,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type User = { id: string; nome: string; email: string };
type RecordItem = {
  id: string;
  entidade: string;
  entidadeId?: string | null;
  acao: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  criadoEm: string;
  usuario?: User | null;
};
type ResponseData = {
  dados: RecordItem[];
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
};
type Filters = { entidades: string[]; acoes: string[]; usuarios: User[] };
const empty: ResponseData = {
  dados: [],
  paginacao: { pagina: 1, limite: 25, total: 0, totalPaginas: 1 },
};
function fmt(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(date));
}
function msg(data: unknown) {
  if (typeof data === "object" && data && "message" in data) {
    const v = (data as { message?: string | string[] }).message;
    return Array.isArray(v) ? v.join(". ") : (v ?? "Erro inesperado");
  }
  return "Erro inesperado";
}

export function AuditManager() {
  const [data, setData] = useState<ResponseData>(empty);
  const [filters, setFilters] = useState<Filters>({
    entidades: [],
    acoes: [],
    usuarios: [],
  });
  const [query, setQuery] = useState({
    busca: "",
    entidade: "",
    acao: "",
    usuarioId: "",
    inicio: "",
    fim: "",
    pagina: 1,
    limite: 25,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<RecordItem | null>(null);
  const load = useCallback(
    async (current = query) => {
      setLoading(true);
      setError("");
      const p = new URLSearchParams();
      Object.entries(current).forEach(([k, v]) => {
        if (v !== "" && v !== undefined) p.set(k, String(v));
      });
      const r = await fetch(`/api/ferramentas/auditoria?${p}`, {
        cache: "no-store",
      });
      const body = await r.json();
      if (!r.ok) {
        setError(msg(body));
        setLoading(false);
        return;
      }
      setData(body);
      setLoading(false);
    },
    [query],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        load(),
        fetch("/api/ferramentas/auditoria/filtros", {
          cache: "no-store",
        }).then(async (r) => {
          const b = await r.json();
          if (r.ok) setFilters(b);
        }),
      ]);
    }, 0);

    return () => window.clearTimeout(timer);
    // A carga inicial deve ocorrer somente na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...query, pagina: 1 };
    setQuery(next);
    void load(next);
  }
  function page(pagina: number) {
    const next = { ...query, pagina };
    setQuery(next);
    void load(next);
  }
  async function open(id: string) {
    const r = await fetch(`/api/ferramentas/auditoria/${id}`, {
      cache: "no-store",
    });
    const b = await r.json();
    if (!r.ok) {
      setError(msg(b));
      return;
    }
    setDetail(b);
  }
  const field =
    "rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700";
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-medium text-red-600">Ferramentas</p>
        <h2 className="text-2xl font-bold">Auditoria geral</h2>
        <p className="mt-1 text-sm text-slate-500">
          Histórico de acessos e alterações em todos os módulos.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Filter size={18} />
          Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative md:col-span-2">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={17}
            />
            <input
              value={query.busca}
              onChange={(e) => setQuery({ ...query, busca: e.target.value })}
              placeholder="Usuário, ação, entidade, IP..."
              className={`${field} w-full pl-10`}
            />
          </label>
          <select
            value={query.entidade}
            onChange={(e) => setQuery({ ...query, entidade: e.target.value })}
            className={field}
          >
            <option value="">Todas as entidades</option>
            {filters.entidades.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            value={query.acao}
            onChange={(e) => setQuery({ ...query, acao: e.target.value })}
            className={field}
          >
            <option value="">Todas as ações</option>
            {filters.acoes.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            value={query.usuarioId}
            onChange={(e) => setQuery({ ...query, usuarioId: e.target.value })}
            className={field}
          >
            <option value="">Todos os usuários</option>
            {filters.usuarios.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={query.inicio}
            onChange={(e) => setQuery({ ...query, inicio: e.target.value })}
            className={field}
          />
          <input
            type="datetime-local"
            value={query.fim}
            onChange={(e) => setQuery({ ...query, fim: e.target.value })}
            className={field}
          />
          <button className="rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white">
            Aplicar filtros
          </button>
        </div>
      </form>
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Executor</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Carregando...
                  </td>
                </tr>
              ) : data.dados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                data.dados.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {fmt(r.criadoEm)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {r.usuario?.nome ?? "Sistema"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.usuario?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {r.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.entidade}
                      <p className="text-xs text-slate-500">{r.entidadeId}</p>
                    </td>
                    <td className="px-4 py-3">{r.ip ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void open(r.id)}
                        title="Ver detalhes"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                      >
                        <Clock3 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <span>
            {data.paginacao.total} registros · Página {data.paginacao.pagina} de{" "}
            {data.paginacao.totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              disabled={data.paginacao.pagina <= 1}
              onClick={() => page(data.paginacao.pagina - 1)}
              className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              disabled={data.paginacao.pagina >= data.paginacao.totalPaginas}
              onClick={() => page(data.paginacao.pagina + 1)}
              className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
      {detail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
            <header className="flex items-center justify-between border-b p-5 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold">Detalhe da auditoria</h3>
                <p className="text-sm text-slate-500">Registro #{detail.id}</p>
              </div>
              <button onClick={() => setDetail(null)}>
                <X />
              </button>
            </header>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Info label="Data" value={fmt(detail.criadoEm)} />
              <Info
                label="Executor"
                value={detail.usuario?.nome ?? "Sistema"}
              />
              <Info label="Ação" value={detail.acao} />
              <Info
                label="Entidade"
                value={`${detail.entidade} ${detail.entidadeId ?? ""}`}
              />
              <Info label="IP" value={detail.ip ?? "-"} />
              <Info label="Dispositivo" value={detail.userAgent ?? "-"} />
              <Json title="Antes" value={detail.dadosAntes} />
              <Json title="Depois" value={detail.dadosDepois} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
function Json({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="md:col-span-2">
      <p className="mb-2 font-semibold">{title}</p>
      <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
        {value == null ? "Sem dados" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
