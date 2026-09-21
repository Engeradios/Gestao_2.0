"use client";

import { History, RotateCcw, Truck, Undo2, X } from "lucide-react";
import { FormEvent, useState } from "react";

type Delivery = {
  id: string;
  status: string;
  clienteNome?: string | null;
  origem: string;
  origemNumero?: string | null;
};

type HistoryItem = {
  id: string;
  statusAnterior?: string | null;
  statusNovo: string;
  observacao?: string | null;
  motivo?: string | null;
  usuarioNome?: string | null;
  registradoEm: string;
};

type Action = "ENTREGUE" | "REENTREGA" | "DEVOLVER" | "HISTORICO" | null;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(
    `/api/estoque-logistica/roteiro-entrega${path}`,
    {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    },
  );
  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Falha na operação";
    throw new Error(message);
  }
  return body as T;
}

export function DeliveryActions({
  delivery,
  canManage,
  onChanged,
}: {
  delivery: Delivery;
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [action, setAction] = useState<Action>(null);
  const [observation, setObservation] = useState("");
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function openHistory() {
    setError("");
    setAction("HISTORICO");
    try {
      setHistory(
        await api<HistoryItem[]>(`/entregas/${delivery.id}/historico`),
      );
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : "Falha ao carregar histórico",
      );
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (action === "ENTREGUE") {
        await api(`/entregas/${delivery.id}/retorno`, {
          method: "POST",
          body: JSON.stringify({
            status: "Entregue",
            observacao: observation || undefined,
          }),
        });
      }
      if (action === "DEVOLVER") {
        await api(`/entregas/${delivery.id}/devolver`, {
          method: "POST",
          body: JSON.stringify({ observacao: observation }),
        });
      }
      if (action === "REENTREGA") {
        await api(`/entregas/${delivery.id}/retorno`, {
          method: "POST",
          body: JSON.stringify({
            status: "Não Entregue",
            motivo: reason,
            observacao: observation,
          }),
        });
        await api(`/entregas/${delivery.id}/reentrega`, {
          method: "POST",
          body: JSON.stringify({
            dataEntrega: newDate,
            observacao: observation,
          }),
        });
      }
      setAction(null);
      setObservation("");
      setReason("");
      setNewDate("");
      await onChanged();
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : "Falha ao confirmar retorno",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1">
        {canManage &&
          !["Entregue", "Cancelado", "Devolvido"].includes(delivery.status) && (
            <>
              <button
                type="button"
                onClick={() => setAction("ENTREGUE")}
                className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
              >
                Entregue
              </button>
              <button
                type="button"
                onClick={() => setAction("REENTREGA")}
                className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
              >
                Reentrega
              </button>
              <button
                type="button"
                onClick={() => setAction("DEVOLVER")}
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Devolver
              </button>
            </>
          )}
        <button
          type="button"
          onClick={() => void openHistory()}
          className="rounded-lg border p-1.5"
          title="Histórico"
          aria-label="Abrir histórico"
        >
          <History size={15} />
        </button>
      </div>

      {action && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  {action === "ENTREGUE" && <Truck size={19} />}
                  {action === "REENTREGA" && <RotateCcw size={19} />}
                  {action === "DEVOLVER" && <Undo2 size={19} />}
                  {action === "HISTORICO"
                    ? "Histórico da entrega"
                    : action === "ENTREGUE"
                      ? "Confirmar entrega"
                      : action === "REENTREGA"
                        ? "Gerar reentrega"
                        : "Devolver à base"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {delivery.origem} {delivery.origemNumero || ""} ·{" "}
                  {delivery.clienteNome || "Cliente não informado"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAction(null)}
                className="rounded-lg border p-2"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {action === "HISTORICO" ? (
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
                {error && (
                  <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border p-3 text-sm"
                  >
                    <p className="font-bold">
                      {item.statusAnterior || "Início"} → {item.statusNovo}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.registradoEm).toLocaleString("pt-BR")} ·{" "}
                      {item.usuarioNome || "Sistema"}
                    </p>
                    {(item.motivo || item.observacao) && (
                      <p className="mt-2">
                        {[item.motivo, item.observacao]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </article>
                ))}
                {!history.length && !error && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Nenhum evento registrado.
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-4">
                {action === "REENTREGA" && (
                  <>
                    <label className="block text-sm">
                      Motivo da não entrega
                      <input
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                      />
                    </label>
                    <label className="block text-sm">
                      Nova data
                      <input
                        required
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                      />
                    </label>
                  </>
                )}
                <label className="block text-sm">
                  Observação
                  <textarea
                    required={action !== "ENTREGUE"}
                    rows={4}
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                  />
                </label>
                {error && (
                  <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAction(null)}
                    className="rounded-xl border px-4 py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={saving}
                    className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
