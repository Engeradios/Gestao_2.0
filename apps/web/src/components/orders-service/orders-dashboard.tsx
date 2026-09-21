"use client";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock3,
  RefreshCw,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
type Indicators = {
  total: number;
  abertas: number;
  fechadas: number;
  canceladas: number;
  clientes: number;
  ultimaSincronizacao?: string;
};
const initial: Indicators = {
  total: 0,
  abertas: 0,
  fechadas: 0,
  canceladas: 0,
  clientes: 0,
};
export default function OrdersDashboard() {
  const [data, setData] = useState(initial),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/operacional/os/indicadores", {
        cache: "no-store",
      });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(p.message || "Falha ao carregar indicadores");
      setData(p);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha ao carregar indicadores",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);
  const cards = [
    ["Total", data.total, ClipboardList],
    ["Abertas", data.abertas, Clock3],
    ["Fechadas", data.fechadas, CheckCircle2],
    ["Canceladas", data.canceladas, Ban],
    ["Clientes", data.clientes, Users],
  ] as const;
  return (
    <section className="space-y-5" aria-labelledby="os-dashboard-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Ordens de Serviço
          </p>
          <h1 id="os-dashboard-title" className="text-2xl font-bold">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Indicadores consolidados das ordens sincronizadas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, Icon]) => (
          <article
            key={label}
            className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {loading ? "…" : value.toLocaleString("pt-BR")}
                </p>
              </div>
              <span className="rounded-xl bg-red-50 p-2.5 text-red-600 dark:bg-red-950/40">
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        ))}
      </div>
      <article className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="font-bold">Sincronização</h2>
        <p className="mt-2 text-sm text-slate-500">
          Última atualização:{" "}
          {data.ultimaSincronizacao
            ? new Date(data.ultimaSincronizacao).toLocaleString("pt-BR")
            : "Não informada"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/ordens-servico/painel"
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Abrir painel
          </Link>
          <Link
            href="/ordens-servico/importacao"
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            Ver importações
          </Link>
        </div>
      </article>
    </section>
  );
}
