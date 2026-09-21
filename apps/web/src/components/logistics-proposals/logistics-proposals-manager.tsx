"use client";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Tracking = {
  status: string;
  responsavel: string | null;
  observacoes: string | null;
  recebidaEm: string | null;
  recebidaPor: string | null;
};

type Proposal = {
  id: number;
  numero: string;
  tipo: string | null;
  area: string | null;
  clienteNome: string | null;
  clienteMunicipio: string | null;
  clienteUf: string | null;
  local: string | null;
  titulo: string | null;
  contrato: string | null;
  atualizadoEm: string | null;
  valProdutos: string | number;
  valServicos: string | number;
  valProposta: string | number;
  nova: boolean;
  acompanhamento: Tracking;
};

type ResponseData = {
  itens: Proposal[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
};

function money(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function date(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function messageOf(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: string | string[] }).message;

    return Array.isArray(message) ? message.join(". ") : message;
  }

  return undefined;
}

export function LogisticsProposalsManager({
  canManage,
}: {
  canManage: boolean;
}) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("NOVA");
  const [area, setArea] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      pagina: String(page),
      porPagina: "25",
    });

    if (search.trim()) params.set("q", search.trim());
    if (status) params.set("status", status);
    if (area) params.set("area", area);

    const response = await fetch(
      `/api/estoque-logistica/novas-propostas?${params}`,
      { cache: "no-store" },
    );

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(messageOf(result) ?? "Não foi possível carregar as propostas.");
      setLoading(false);
      return;
    }

    setData(result as ResponseData);
    setLoading(false);
  }, [area, page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function receive(proposal: Proposal) {
    setReceivingId(proposal.id);
    setError("");
    setMessage("");

    const response = await fetch(
      `/api/estoque-logistica/novas-propostas/${proposal.id}/receber`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    const result = await response.json().catch(() => null);

    setReceivingId(null);

    if (!response.ok) {
      setError(
        messageOf(result) ?? "Não foi possível confirmar o recebimento.",
      );
      return;
    }

    setMessage(`Proposta ${proposal.numero} recebida pela logística.`);

    await load();
  }

  const newCount = data?.itens.filter((item) => item.nova).length ?? 0;

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
          Estoque e Logística
        </p>

        <h1 className="mt-1 text-3xl font-bold">Novas Propostas</h1>

        <p className="mt-2 text-sm text-slate-500">
          Propostas aprovadas com materiais destinados ao fluxo logístico.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
          <Clock3 className="text-amber-600" />
          <p className="mt-3 text-3xl font-bold">{newCount}</p>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Novas nesta página
          </p>
        </article>

        <article className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <PackageCheck className="text-blue-600" />
          <p className="mt-3 text-3xl font-bold">{data?.total ?? 0}</p>
          <p className="text-sm text-slate-500">Propostas encontradas</p>
        </article>

        <article className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <CheckCircle2 className="text-emerald-600" />
          <p className="mt-3 text-3xl font-bold">
            {(data?.itens.length ?? 0) - newCount}
          </p>
          <p className="text-sm text-slate-500">Já recebidas nesta página</p>
        </article>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[1fr_200px_200px]">
        <label className="flex items-center gap-3 rounded-xl border px-4 dark:border-slate-700">
          <Search size={18} />

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Proposta, cliente ou contrato..."
            className="w-full bg-transparent py-3 outline-none"
          />
        </label>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border bg-transparent px-4 py-3 dark:border-slate-700"
        >
          <option value="">Todas as situações</option>
          <option value="NOVA">Novas</option>
          <option value="RECEBIDA">Recebidas</option>
        </select>

        <select
          value={area}
          onChange={(event) => {
            setArea(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border bg-transparent px-4 py-3 dark:border-slate-700"
        >
          <option value="">Logística e ambas</option>
          <option value="LOGISTICA">Somente logística</option>
          <option value="AMBAS">Ambas</option>
        </select>
      </div>

      {message && (
        <p className="rounded-xl bg-emerald-100 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-red-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {data?.itens.map((proposal) => (
            <article
              key={proposal.id}
              className={
                proposal.nova
                  ? "rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 shadow-sm dark:bg-amber-950/40"
                  : "rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">
                      Proposta {proposal.numero}
                    </h2>

                    {proposal.nova && (
                      <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white">
                        Nova
                      </span>
                    )}

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                      {proposal.area}
                    </span>
                  </div>

                  <p className="mt-2 font-medium">
                    {proposal.clienteNome ?? "Cliente não informado"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {[
                      proposal.local,
                      proposal.clienteMunicipio,
                      proposal.clienteUf,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">
                    {money(proposal.valProposta)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Atualizada em {date(proposal.atualizadoEm)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-slate-500">Tipo</p>
                  <p className="font-medium">{proposal.tipo ?? "-"}</p>
                </div>

                <div>
                  <p className="text-slate-500">Produtos</p>
                  <p className="font-medium">{money(proposal.valProdutos)}</p>
                </div>

                <div>
                  <p className="text-slate-500">Serviços</p>
                  <p className="font-medium">{money(proposal.valServicos)}</p>
                </div>

                <div>
                  <p className="text-slate-500">Contrato</p>
                  <p className="font-medium">{proposal.contrato ?? "-"}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 dark:border-slate-800">
                <p className="text-sm text-slate-500">
                  Situação logística:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {proposal.acompanhamento.status}
                  </strong>
                </p>

                {proposal.nova && canManage && (
                  <button
                    type="button"
                    disabled={receivingId === proposal.id}
                    onClick={() => void receive(proposal)}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {receivingId === proposal.id ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <PackageCheck size={17} />
                    )}
                    Confirmar recebimento
                  </button>
                )}
              </div>
            </article>
          ))}

          {!data?.itens.length && (
            <div className="rounded-2xl border p-10 text-center text-slate-500 dark:border-slate-800">
              Nenhuma proposta encontrada.
            </div>
          )}
        </div>
      )}

      {(data?.totalPaginas ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl border px-4 py-2 disabled:opacity-40"
          >
            Anterior
          </button>

          <span className="text-sm text-slate-500">
            Página {data?.pagina} de {data?.totalPaginas}
          </span>

          <button
            type="button"
            disabled={page >= (data?.totalPaginas ?? 1)}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-xl border px-4 py-2 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </section>
  );
}
