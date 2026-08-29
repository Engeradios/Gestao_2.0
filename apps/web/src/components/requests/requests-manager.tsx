"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  REQUEST_PRIORITIES,
  REQUEST_PRIORITY_LABELS,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPES,
  REQUEST_TYPE_LABELS,
  RequestListResponse,
  RequestPriority,
  RequestStatus,
  RequestType,
  ServiceRequest,
  requestErrorMessage,
} from "./types";

interface RequestsManagerProps {
  canCreate: boolean;
  canManage: boolean;
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-950";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";

function badge(status: RequestStatus) {
  const colors: Record<RequestStatus, string> = {
    ABERTA: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    EM_ANALISE:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    EM_DESENVOLVIMENTO:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    CONCLUIDA:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    CANCELADA:
      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return colors[status];
}

function formatDate(value: string | null) {
  if (!value) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RequestsManager({
  canCreate,
  canManage,
}: RequestsManagerProps) {
  const [records, setRecords] = useState<ServiceRequest[]>([]);
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      pagina: String(page),
      limite: "25",
    });

    if (search.trim()) params.set("busca", search.trim());
    if (status) params.set("status", status);
    if (type) params.set("tipo", type);
    if (priority) params.set("prioridade", priority);

    try {
      const response = await fetch(`/api/solicitacoes?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as RequestListResponse | unknown;

      if (!response.ok) {
        throw new Error(requestErrorMessage(data));
      }

      const result = data as RequestListResponse;
      setRecords(result.dados);
      setTotal(result.paginacao.total);
      setTotalPages(result.paginacao.totalPaginas);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar as solicitações.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, priority, search, status, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const form = event.currentTarget;
    const values = new FormData(form);

    const payload = {
      tipo: values.get("tipo") as RequestType,
      titulo: String(values.get("titulo") || ""),
      descricao: String(values.get("descricao") || ""),
      paginaUrl: String(values.get("paginaUrl") || "").trim() || undefined,
      prioridade: values.get("prioridade") as RequestPriority,
    };

    try {
      const response = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(requestErrorMessage(data));
      }

      form.reset();
      setMessage(`Solicitação ${data.protocolo || ""} criada com sucesso.`);
      setPage(1);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar a solicitação.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openRequest(id: string) {
    setError("");

    try {
      const response = await fetch(`/api/solicitacoes/${id}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(requestErrorMessage(data));
      }

      setSelected(data as ServiceRequest);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível abrir a solicitação.",
      );
    }
  }

  async function manageRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setSaving(true);
    setError("");
    setMessage("");

    const values = new FormData(event.currentTarget);

    const payload = {
      status: values.get("status") as RequestStatus,
      prioridade: values.get("prioridade") as RequestPriority,
      resposta: String(values.get("resposta") || ""),
      observacao: String(values.get("observacao") || ""),
    };

    try {
      const response = await fetch(`/api/solicitacoes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(requestErrorMessage(data));
      }

      setMessage("Solicitação atualizada com sucesso.");
      await load();
      await openRequest(selected.id);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar a solicitação.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
            Atendimento interno
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">
            Central de Solicitações
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Registre erros, melhorias e novas necessidades do sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          <RefreshCw size={17} />
          Atualizar
        </button>
      </header>

      {message && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {canCreate && (
        <form onSubmit={createRequest} className={`${cardClass} p-5 md:p-6`}>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              <MessageSquarePlus size={20} />
            </span>
            <div>
              <h2 className="font-semibold">Nova solicitação</h2>
              <p className="text-sm text-slate-500">
                Descreva claramente a necessidade encontrada.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              Tipo
              <select
                name="tipo"
                required
                defaultValue="ERRO"
                className={`mt-1 ${fieldClass}`}
              >
                {REQUEST_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {REQUEST_TYPE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Prioridade
              <select
                name="prioridade"
                required
                defaultValue="NORMAL"
                className={`mt-1 ${fieldClass}`}
              >
                {REQUEST_PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {REQUEST_PRIORITY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Página relacionada
              <input
                name="paginaUrl"
                placeholder="/operacional/servicos"
                maxLength={500}
                className={`mt-1 ${fieldClass}`}
              />
            </label>
          </div>

          <label className="mt-4 block text-sm">
            Título
            <input
              name="titulo"
              required
              minLength={5}
              maxLength={180}
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="mt-4 block text-sm">
            Descrição
            <textarea
              name="descricao"
              required
              minLength={10}
              maxLength={10000}
              rows={5}
              className={`mt-1 resize-y ${fieldClass}`}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}
            Enviar solicitação
          </button>
        </form>
      )}

      <section className={`${cardClass} p-5 md:p-6`}>
        <div className="grid gap-3 lg:grid-cols-5">
          <label className="relative lg:col-span-2">
            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Buscar por protocolo, título ou descrição"
              className={`${fieldClass} pl-10`}
            />
          </label>

          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className={fieldClass}
          >
            <option value="">Todos os status</option>
            {REQUEST_STATUSES.map((item) => (
              <option key={item} value={item}>
                {REQUEST_STATUS_LABELS[item]}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(event) => {
              setPage(1);
              setType(event.target.value);
            }}
            className={fieldClass}
          >
            <option value="">Todos os tipos</option>
            {REQUEST_TYPES.map((item) => (
              <option key={item} value={item}>
                {REQUEST_TYPE_LABELS[item]}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(event) => {
              setPage(1);
              setPriority(event.target.value);
            }}
            className={fieldClass}
          >
            <option value="">Todas as prioridades</option>
            {REQUEST_PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {REQUEST_PRIORITY_LABELS[item]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-3 py-3">Protocolo</th>
                <th className="px-3 py-3">Solicitação</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Prioridade</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-slate-100 dark:border-slate-900"
                >
                  <td className="px-3 py-4 font-mono text-xs">
                    {record.protocolo}
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-semibold">{record.titulo}</p>
                    {canManage && (
                      <p className="mt-1 text-xs text-slate-500">
                        {record.solicitante.nome}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    {REQUEST_TYPE_LABELS[record.tipo]}
                  </td>
                  <td className="px-3 py-4">
                    {REQUEST_PRIORITY_LABELS[record.prioridade]}
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge(record.status)}`}
                    >
                      {REQUEST_STATUS_LABELS[record.status]}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-slate-500">
                    {formatDate(record.criadoEm)}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => void openRequest(record.id)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-900"
                      aria-label="Visualizar solicitação"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && records.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-500">
              Nenhuma solicitação encontrada.
            </p>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-red-600" />
            </div>
          )}
        </div>

        <footer className="mt-5 flex items-center justify-between text-sm">
          <span className="text-slate-500">{total} registro(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border p-2 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <button
            type="button"
            aria-label="Fechar detalhes"
            onClick={() => setSelected(null)}
            className="absolute inset-0"
          />

          <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <X size={20} />
            </button>

            <p className="font-mono text-sm text-red-600">
              {selected.protocolo}
            </p>
            <h2 className="mt-2 pr-10 text-2xl font-bold">{selected.titulo}</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <p className="text-sm">
                <strong>Solicitante:</strong> {selected.solicitante.nome}
              </p>
              <p className="text-sm">
                <strong>Criada em:</strong> {formatDate(selected.criadoEm)}
              </p>
              <p className="text-sm">
                <strong>Tipo:</strong> {REQUEST_TYPE_LABELS[selected.tipo]}
              </p>
              <p className="text-sm">
                <strong>E-mail:</strong> {selected.emailStatus}
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm whitespace-pre-wrap dark:bg-slate-900">
              {selected.descricao}
            </div>

            {selected.resposta && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                <p className="mb-2 text-sm font-semibold">Resposta</p>
                <p className="text-sm whitespace-pre-wrap">
                  {selected.resposta}
                </p>
              </div>
            )}

            {canManage && (
              <form
                onSubmit={manageRequest}
                className="mt-6 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800"
              >
                <h3 className="font-semibold">Gerenciar solicitação</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    Status
                    <select
                      name="status"
                      defaultValue={selected.status}
                      className={`mt-1 ${fieldClass}`}
                    >
                      {REQUEST_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {REQUEST_STATUS_LABELS[item]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    Prioridade
                    <select
                      name="prioridade"
                      defaultValue={selected.prioridade}
                      className={`mt-1 ${fieldClass}`}
                    >
                      {REQUEST_PRIORITIES.map((item) => (
                        <option key={item} value={item}>
                          {REQUEST_PRIORITY_LABELS[item]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm">
                  Resposta
                  <textarea
                    name="resposta"
                    rows={4}
                    defaultValue={selected.resposta || ""}
                    className={`mt-1 ${fieldClass}`}
                  />
                </label>

                <label className="block text-sm">
                  Observação do histórico
                  <textarea
                    name="observacao"
                    rows={3}
                    className={`mt-1 ${fieldClass}`}
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving && <Loader2 size={17} className="animate-spin" />}
                  Salvar alterações
                </button>
              </form>
            )}

            {selected.historicos && selected.historicos.length > 0 && (
              <section className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
                <h3 className="font-semibold">Histórico</h3>
                <div className="mt-4 space-y-4">
                  {selected.historicos.map((item) => (
                    <article
                      key={item.id}
                      className="border-l-2 border-red-500 pl-4"
                    >
                      <p className="text-sm font-semibold">{item.acao}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.observacao || "Sem observação"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(item.criadoEm)}
                        {item.usuario ? ` · ${item.usuario.nome}` : ""}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
