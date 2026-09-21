"use client";
import { useCallback, useEffect, useRef, useState } from "react";
type Item = {
  numero: string;
  cliente: string | null;
  contrato: string | null;
  tipo: string | null;
  uf?: string | null;
  representante?: string | null;
  data_cadastro?: string | null;
  data_aprovacao?: string | null;
  data_conclusao?: string | null;
  possui_servico?: boolean;
  val_produtos?: string;
  val_servicos?: string;
  val_tarifadores?: string;
  val_frete?: string;
  val_desconto?: string;
  val_proposta: string;
  quantidade_pedidos: number;
  pedidos: string[];
  valor_pedidos?: string;
  valor_produtos_pedidos?: string;
  quantidade_titulos: number;
  valor_emitido: string;
  valor_recebido: string;
  valor_devido: string;
  possui_vencido: boolean;
  possui_a_vencer?: boolean;
  referencia_generica?: boolean;
  classificacao: string;
  diferenca: string;
  revisao_status?: "AGUARDANDO" | "CONFIRMADO" | "REABERTO";
  revisao_observacao?: string | null;
  confirmado_por_nome?: string | null;
  confirmado_em?: string | null;
  reaberto_por_nome?: string | null;
  reaberto_em?: string | null;
  pode_confirmar?: boolean;
  motivo_bloqueio?: string | null;
};
type List = {
  itens: Item[];
  paginacao: { pagina: number; limite: number; total: number; paginas: number };
};
type Summary = {
  itens: Array<{
    classificacao: string;
    quantidade: number;
    valor_propostas: string;
    valor_emitido: string;
  }>;
};
type Filters = {
  classificacoes: string[];
  tipos: Array<string | null>;
  ufs: Array<string | null>;
  representantes: Array<string | null>;
};
const money = (v: unknown) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const date = (v?: string | null) =>
  v
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(v))
    : "—";
const datetime = (v?: string | null) =>
  v
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
const labels: Record<string, string> = {
  COM_COBRANCA: "Com cobrança",
  SEM_PEDIDO: "Sem pedido",
  SEM_COBRANCA: "Sem cobrança",
  MULTIPLOS_PEDIDOS: "Múltiplos pedidos",
  REFERENCIA_FINANCEIRA_GENERICA: "Referência genérica",
  AGUARDANDO: "Aguardando",
  CONFIRMADO: "Confirmado",
  REABERTO: "Reaberto",
};
const badge = (c: string) =>
  c === "COM_COBRANCA" || c === "CONFIRMADO"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    : c === "SEM_PEDIDO" || c === "SEM_COBRANCA"
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
function messageOf(v: unknown) {
  if (
    v &&
    typeof v === "object" &&
    "message" in v &&
    typeof v.message === "string"
  )
    return v.message;
  return "Não foi possível concluir a operação.";
}
export function BillingAudit({ canConfirm }: { canConfirm: boolean }) {
  const [data, setData] = useState<List | null>(null),
    [summary, setSummary] = useState<Summary | null>(null),
    [filters, setFilters] = useState<Filters | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [detail, setDetail] = useState<Item | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(""),
    [saving, setSaving] = useState(false),
    [action, setAction] = useState<"confirmar" | "reabrir" | null>(null),
    [observation, setObservation] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null),
    confirmRef = useRef<HTMLDialogElement>(null),
    triggerRef = useRef<HTMLButtonElement | null>(null);
  const [q, setQ] = useState({
    pagina: 1,
    limite: 25,
    busca: "",
    classificacao: "",
    somentePendencias: "false",
  });
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = new URLSearchParams(
        Object.entries(q).map(([k, v]) => [k, String(v)]),
      );
      const [a, b, c] = await Promise.all([
        fetch(`/api/propostas/auditoria-faturamento?${s}`, {
          cache: "no-store",
        }),
        fetch("/api/propostas/auditoria-faturamento/resumo", {
          cache: "no-store",
        }),
        fetch("/api/propostas/auditoria-faturamento/filtros", {
          cache: "no-store",
        }),
      ]);
      if (!a.ok || !b.ok || !c.ok)
        throw new Error("Não foi possível carregar a auditoria.");
      setData(await a.json());
      setSummary(await b.json());
      setFilters(await c.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha inesperada.");
    } finally {
      setLoading(false);
    }
  }, [q]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (detail && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
      dialogRef.current.focus();
    }
  }, [detail]);
  useEffect(() => {
    if (action && confirmRef.current && !confirmRef.current.open)
      confirmRef.current.showModal();
  }, [action]);
  async function getDetail(numero: string) {
    const r = await fetch(
      `/api/propostas/auditoria-faturamento/${encodeURIComponent(numero)}`,
      { cache: "no-store" },
    );
    const body: unknown = await r.json().catch(() => null);
    if (!r.ok) throw new Error(messageOf(body));
    return body as Item;
  }
  async function openDetail(numero: string, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setDetailLoading(true);
    setDetailError("");
    try {
      setDetail(await getDetail(numero));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Falha inesperada.");
    } finally {
      setDetailLoading(false);
    }
  }
  function closeDetail() {
    dialogRef.current?.close();
    setDetail(null);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }
  function ask(next: "confirmar" | "reabrir") {
    setObservation("");
    setDetailError("");
    setAction(next);
  }
  function cancelAction() {
    confirmRef.current?.close();
    setAction(null);
  }
  async function submitAction() {
    if (!detail || !action) return;
    setSaving(true);
    setDetailError("");
    try {
      const r = await fetch(
        `/api/propostas/auditoria-faturamento/${encodeURIComponent(detail.numero)}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ observacao: observation.trim() || undefined }),
        },
      );
      const body: unknown = await r.json().catch(() => null);
      if (!r.ok) throw new Error(messageOf(body));
      cancelAction();
      setDetail(await getDetail(detail.numero));
      await load();
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Falha inesperada.");
      cancelAction();
    } finally {
      setSaving(false);
    }
  }
  const total =
      summary?.itens.reduce((s, x) => s + Number(x.quantidade), 0) || 0,
    pend =
      summary?.itens
        .filter((x) => x.classificacao !== "COM_COBRANCA")
        .reduce((s, x) => s + Number(x.quantidade), 0) || 0;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Propostas</p>
        <h1 className="text-2xl font-bold">Auditoria de faturamento</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conciliação consultiva entre proposta, pedido e contas a receber.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Propostas auditadas" value={String(total)} />
        <Card label="Possíveis pendências" value={String(pend)} />
        <Card
          label="Regulares"
          value={String(
            summary?.itens.find((x) => x.classificacao === "COM_COBRANCA")
              ?.quantidade || 0,
          )}
        />
        <Card
          label="Sem cobrança"
          value={String(
            summary?.itens.find((x) => x.classificacao === "SEM_COBRANCA")
              ?.quantidade || 0,
          )}
        />
      </section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="rounded-lg border px-3 py-2 dark:bg-slate-900"
            placeholder="Proposta, cliente ou contrato"
            value={q.busca}
            onChange={(e) => setQ({ ...q, busca: e.target.value, pagina: 1 })}
          />
          <select
            className="rounded-lg border px-3 py-2 dark:bg-slate-900"
            value={q.classificacao}
            onChange={(e) =>
              setQ({ ...q, classificacao: e.target.value, pagina: 1 })
            }
          >
            <option value="">Todas as classificações</option>
            {filters?.classificacoes.map((x) => (
              <option key={x} value={x}>
                {labels[x] || x}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <input
              type="checkbox"
              checked={q.somentePendencias === "true"}
              onChange={(e) =>
                setQ({
                  ...q,
                  somentePendencias: String(e.target.checked),
                  pagina: 1,
                })
              }
            />
            Somente pendências
          </label>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
            onClick={() => void load()}
          >
            Atualizar
          </button>
        </div>
      </section>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <caption className="sr-only">
              Conciliação e revisão de faturamento
            </caption>
            <thead className="bg-slate-50 text-left dark:bg-slate-900">
              <tr>
                {[
                  "Proposta",
                  "Cliente",
                  "Valor proposta",
                  "Pedidos",
                  "Títulos",
                  "Emitido",
                  "Situação automática",
                  "Data de aprovação",
                  "Última conclusão",
                  "Situação da revisão",
                  "Revisado por",
                  "Revisado em",
                  "Ações",
                ].map((x) => (
                  <th key={x} className="px-4 py-3 font-semibold">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center">
                    Carregando...
                  </td>
                </tr>
              ) : data?.itens.length ? (
                data.itens.map((x) => (
                  <tr key={x.numero} className="border-t dark:border-slate-800">
                    <td className="px-4 py-3 font-semibold">{x.numero}</td>
                    <td className="px-4 py-3">{x.cliente || "—"}</td>
                    <td className="px-4 py-3">{money(x.val_proposta)}</td>
                    <td className="px-4 py-3">{x.quantidade_pedidos}</td>
                    <td className="px-4 py-3">{x.quantidade_titulos}</td>
                    <td className="px-4 py-3">{money(x.valor_emitido)}</td>
                    <td className="px-4 py-3">
                      <Tag value={x.classificacao} />
                    </td>
                    <td className="px-4 py-3">{date(x.data_aprovacao)}</td>
                    <td className="px-4 py-3">
                      {!x.possui_servico
                        ? "Não se aplica"
                        : x.data_conclusao
                          ? date(x.data_conclusao)
                          : "Aguardando conclusão"}
                    </td>
                    <td className="px-4 py-3">
                      <Tag value={x.revisao_status || "AGUARDANDO"} />
                      {x.motivo_bloqueio && (
                        <p className="mt-1 max-w-48 text-xs text-amber-700">
                          {x.motivo_bloqueio}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {x.revisao_status === "REABERTO"
                        ? x.reaberto_por_nome || "—"
                        : x.confirmado_por_nome || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {datetime(
                        x.revisao_status === "REABERTO"
                          ? x.reaberto_em
                          : x.confirmado_em,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={detailLoading}
                        onClick={(e) =>
                          void openDetail(x.numero, e.currentTarget)
                        }
                        className="rounded-lg border px-3 py-1.5 font-semibold"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="p-8 text-center">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t p-4">
          <span>{data?.paginacao.total || 0} registros</span>
          <div className="flex gap-2">
            <button
              className="rounded border px-3 py-1.5 disabled:opacity-40"
              disabled={!data || q.pagina <= 1}
              onClick={() => setQ({ ...q, pagina: q.pagina - 1 })}
            >
              Anterior
            </button>
            <span className="px-2 py-1.5">
              {q.pagina} / {data?.paginacao.paginas || 1}
            </span>
            <button
              className="rounded border px-3 py-1.5 disabled:opacity-40"
              disabled={!data || q.pagina >= data.paginacao.paginas}
              onClick={() => setQ({ ...q, pagina: q.pagina + 1 })}
            >
              Próxima
            </button>
          </div>
        </div>
      </section>
      {detailError && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {detailError}
        </div>
      )}
      {detail && (
        <dialog
          ref={dialogRef}
          onCancel={(e) => {
            e.preventDefault();
            closeDetail();
          }}
          aria-labelledby="detail-title"
          className="m-auto max-h-[92vh] w-[min(1100px,calc(100%-2rem))] overflow-auto rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-black/60 dark:bg-slate-950"
        >
          <header className="sticky top-0 z-10 flex justify-between border-b bg-white p-5 dark:bg-slate-950">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Auditoria de faturamento
              </p>
              <h2 id="detail-title" className="text-2xl font-bold">
                Proposta {detail.numero}
              </h2>
              <p className="text-sm text-slate-500">
                {detail.cliente || "Cliente não informado"}
              </p>
            </div>
            <button
              onClick={closeDetail}
              className="rounded-lg border px-3 py-2"
            >
              Fechar
            </button>
          </header>
          <div className="space-y-5 p-5">
            <DetailSection title="Datas e revisão">
              <Info
                label="Data de aprovação"
                value={date(detail.data_aprovacao)}
              />
              <Info
                label="Última conclusão"
                value={
                  !detail.possui_servico
                    ? "Não se aplica"
                    : detail.data_conclusao
                      ? date(detail.data_conclusao)
                      : "Aguardando conclusão"
                }
              />
              <Info
                label="Situação da revisão"
                value={labels[detail.revisao_status || "AGUARDANDO"]}
              />
              <Info
                label="Revisado por"
                value={detail.confirmado_por_nome || "—"}
              />
              <Info
                label="Revisado em"
                value={datetime(detail.confirmado_em)}
              />
              <Info
                label="Motivo do bloqueio"
                value={detail.motivo_bloqueio || "Nenhum"}
              />
            </DetailSection>
            <DetailSection title="Resultado financeiro">
              <Info
                label="Classificação"
                value={labels[detail.classificacao] || detail.classificacao}
              />
              <Info
                label="Valor da proposta"
                value={money(detail.val_proposta)}
              />
              <Info
                label="Valor dos pedidos"
                value={money(detail.valor_pedidos)}
              />
              <Info label="Valor emitido" value={money(detail.valor_emitido)} />
              <Info label="Valor devido" value={money(detail.valor_devido)} />
              <Info label="Diferença" value={money(detail.diferenca)} />
            </DetailSection>
            <div className="rounded-2xl border p-4">
              <p className="font-semibold">Confirmação da revisão</p>
              <p className="mt-1 text-sm text-slate-500">
                A confirmação registra usuário, data e snapshot dos valores.
                Nenhum dado financeiro de origem é alterado.
              </p>
              {canConfirm ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.revisao_status === "CONFIRMADO" ? (
                    <button
                      onClick={() => ask("reabrir")}
                      disabled={saving}
                      className="rounded-lg border border-amber-500 px-4 py-2 font-semibold text-amber-700"
                    >
                      Reabrir revisão
                    </button>
                  ) : (
                    <button
                      onClick={() => ask("confirmar")}
                      disabled={saving || !detail.pode_confirmar}
                      className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
                    >
                      Confirmar revisão
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Usuário sem permissão para confirmar.
                </p>
              )}
            </div>
          </div>
        </dialog>
      )}
      {action && (
        <dialog
          ref={confirmRef}
          onCancel={(e) => {
            e.preventDefault();
            cancelAction();
          }}
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
          className="m-auto w-[min(560px,calc(100%-2rem))] rounded-2xl bg-white p-6 shadow-2xl backdrop:bg-black/60 dark:bg-slate-950"
        >
          <h2 id="confirm-title" className="text-xl font-bold">
            {action === "confirmar" ? "Confirmar revisão" : "Reabrir revisão"}
          </h2>
          <p
            id="confirm-desc"
            className="mt-2 text-sm text-slate-600 dark:text-slate-300"
          >
            {action === "confirmar"
              ? "Confirmo que revisei a proposta, os pedidos, as cobranças e o serviço, e que o processo está correto."
              : "A revisão voltará ao estado Reaberto e deverá ser conferida novamente."}
          </p>
          <label className="mt-4 block text-sm font-semibold">
            Observação opcional
            <textarea
              value={observation}
              maxLength={1000}
              onChange={(e) => setObservation(e.target.value)}
              className="mt-2 min-h-24 w-full rounded-lg border p-3 dark:bg-slate-900"
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              autoFocus
              onClick={cancelAction}
              disabled={saving}
              className="rounded-lg border px-4 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={() => void submitAction()}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
function Tag({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge(value)}`}
    >
      {labels[value] || value}
    </span>
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
    <section className="rounded-2xl border p-4">
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}
function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
