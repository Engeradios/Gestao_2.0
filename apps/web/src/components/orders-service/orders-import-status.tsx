"use client";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
type Sync = {
  id: string;
  tipo: string;
  status: string;
  iniciadoEm: string;
  finalizadoEm?: string | null;
  clientesLidos: number;
  osLidas: number;
  equipamentosProcessados: number;
  mensagem?: string | null;
};
type Status = {
  ultima?: Sync | null;
  emExecucao: number;
  equipamentos: number;
};
export default function OrdersImportStatus() {
  const [status, setStatus] = useState<Status>({
      emExecucao: 0,
      equipamentos: 0,
    }),
    [history, setHistory] = useState<Sync[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, b] = await Promise.all([
        fetch("/api/operacional/os/sincronizacoes/status", {
          cache: "no-store",
        }),
        fetch("/api/operacional/os/sincronizacoes?limite=20", {
          cache: "no-store",
        }),
      ]);
      const [sa, h] = await Promise.all([
        a.json().catch(() => ({})),
        b.json().catch(() => []),
      ]);
      if (!a.ok || !b.ok)
        throw new Error(sa.message || "Falha ao consultar sincronizações");
      setStatus(sa);
      setHistory(Array.isArray(h) ? h : []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha ao consultar sincronizações",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);
  return (
    <section className="space-y-5" aria-labelledby="os-import-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Ordens de Serviço
          </p>
          <h1 id="os-import-title" className="text-2xl font-bold">
            Importação
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhamento somente leitura das sincronizações existentes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </header>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Não existe endpoint de upload ou execução manual no backend atual. Esta
        tela não cria um processo novo e apenas apresenta o histórico já
        registrado.
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card label="Em execução" value={status.emExecucao} />
        <Card label="Equipamentos" value={status.equipamentos} />
        <Card
          label="Último status"
          value={status.ultima?.status || "Sem registro"}
        />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Clientes</th>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Equipamentos</th>
                <th className="px-4 py-3">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {history.length ? (
                history.map((x) => (
                  <tr key={x.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(x.iniciadoEm).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{x.tipo}</td>
                    <td className="px-4 py-3">{x.status}</td>
                    <td className="px-4 py-3">{x.clientesLidos}</td>
                    <td className="px-4 py-3">{x.osLidas}</td>
                    <td className="px-4 py-3">{x.equipamentosProcessados}</td>
                    <td className="px-4 py-3">{x.mensagem || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {loading
                      ? "Carregando..."
                      : "Nenhuma sincronização registrada."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
    </article>
  );
}
