"use client";

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  DeliverySourceSearch,
  type DeliverySuggestion,
} from "./delivery-source-search";
import { FormEvent, useMemo, useState } from "react";

type Driver = { id: string; nome: string };
type Vehicle = { id: string; placa: string; modelo?: string | null };
type Stop = {
  localId: string;
  origem: "OS" | "PEDIDO" | "OUTRO";
  origemNumero: string;
  clienteNome: string;
  enderecoEntrega: string;
  bairro: string;
  cidade: string;
  uf: string;
  observacaoRota: string;
};

type Props = {
  initialDate: string;
  drivers: Driver[];
  vehicles: Vehicle[];
  onClose: () => void;
  onCompleted: (date: string) => Promise<void> | void;
};

const emptyStop = (): Stop => ({
  localId: crypto.randomUUID(),
  origem: "OS",
  origemNumero: "",
  clienteNome: "",
  enderecoEntrega: "",
  bairro: "",
  cidade: "",
  uf: "RJ",
  observacaoRota: "",
});

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(
    `/api/estoque-logistica/roteiro-entrega${path}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
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

export function DeliveryRouteBuilder({
  initialDate,
  drivers,
  vehicles,
  onClose,
  onCompleted,
}: Props) {
  const [dataRota, setDataRota] = useState(initialDate);
  const [entregadorId, setEntregadorId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [draft, setDraft] = useState<Stop>(emptyStop);
  const [stops, setStops] = useState<Stop[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [routeId, setRouteId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const duplicate = useMemo(() => {
    const number = draft.origemNumero.replace(/\D/g, "");
    return Boolean(
      number &&
      stops.some(
        (item) =>
          item.origem === draft.origem &&
          item.origemNumero.replace(/\D/g, "") === number,
      ),
    );
  }, [draft.origem, draft.origemNumero, stops]);

  function selectSuggestion(item: DeliverySuggestion) {
    const next: Stop = {
      localId: crypto.randomUUID(),
      origem: item.origem,
      origemNumero: item.numero || "",
      clienteNome: item.clienteNome || "",
      enderecoEntrega: item.enderecoEntrega || "",
      bairro: item.bairro || "",
      cidade: item.cidade || "",
      uf: item.uf || "RJ",
      observacaoRota: "",
    };
    const number = next.origemNumero.replace(/\D/g, "");
    if (
      number &&
      stops.some(
        (stop) =>
          stop.origem === next.origem &&
          stop.origemNumero.replace(/\D/g, "") === number,
      )
    ) {
      setError("Esta OS ou pedido já foi incluído no roteiro.");
      return;
    }
    setStops((current) => [...current, next]);
    setError("");
  }

  function addStop(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (duplicate) {
      setError("Esta OS ou pedido já foi incluído no roteiro.");
      return;
    }
    if (!draft.clienteNome.trim() || !draft.enderecoEntrega.trim()) {
      setError("Informe cliente e endereço da parada.");
      return;
    }
    setStops((current) => [...current, draft]);
    setDraft(emptyStop());
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= stops.length) return;
    setStops((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropAt(target: number) {
    if (dragIndex === null || dragIndex === target) return;
    setStops((current) => {
      const next = [...current];
      const [item] = next.splice(dragIndex, 1);
      next.splice(target, 0, item);
      return next;
    });
    setDragIndex(null);
  }

  async function persist(): Promise<string> {
    if (!entregadorId || !veiculoId) {
      throw new Error("Selecione entregador e veículo.");
    }
    if (!stops.length) throw new Error("Inclua pelo menos uma parada.");

    let id = routeId;
    if (!id) {
      const route = await api<{ id: string }>("/roteiros", {
        method: "POST",
        body: JSON.stringify({
          dataRota,
          entregadorId: Number(entregadorId),
          veiculoId: Number(veiculoId),
          observacoes,
        }),
      });
      id = route.id;
      setRouteId(id);
    } else {
      await api(`/roteiros/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          dataRota,
          entregadorId: Number(entregadorId),
          veiculoId: Number(veiculoId),
          observacoes,
        }),
      });
    }

    await api(`/roteiros/${id}/paradas`, {
      method: "PATCH",
      body: JSON.stringify({
        paradas: stops.map((stop, index) => ({
          origem: stop.origem,
          origemNumero: stop.origemNumero || undefined,
          clienteNome: stop.clienteNome,
          enderecoEntrega: stop.enderecoEntrega,
          bairro: stop.bairro || undefined,
          cidade: stop.cidade || undefined,
          uf: stop.uf || undefined,
          ordemExecucao: index + 1,
          observacaoRota: stop.observacaoRota || undefined,
        })),
      }),
    });
    return id;
  }

  async function saveDraft() {
    setSaving(true);
    setError("");
    try {
      await persist();
      await onCompleted(dataRota);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Falha ao salvar roteiro",
      );
    } finally {
      setSaving(false);
    }
  }

  async function dispatch() {
    if (
      !confirm(
        "Despachar este roteiro? Após o despacho, as paradas ficarão bloqueadas para edição.",
      )
    )
      return;
    setSaving(true);
    setError("");
    try {
      const id = await persist();
      await api(`/roteiros/${id}/despachar`, { method: "POST" });
      await onCompleted(dataRota);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Falha ao despachar roteiro",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 md:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-builder-title"
        className="mx-auto min-h-[90vh] max-w-[1500px] rounded-3xl bg-slate-50 shadow-2xl dark:bg-slate-950"
      >
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-3xl border-b bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div>
            <h2 id="route-builder-title" className="text-xl font-bold">
              Montar roteiro completo
            </h2>
            <p className="text-sm text-slate-500">
              Inclua, revise, ordene e despache todas as paradas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saving}
              className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : routeId
                  ? "Atualizar rascunho"
                  : "Salvar rascunho"}
            </button>
            <button
              type="button"
              onClick={() => void dispatch()}
              disabled={saving || !stops.length}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send size={17} /> Despachar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border p-2"
              aria-label="Fechar construtor"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="grid gap-4 p-4 xl:grid-cols-[390px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold">Dados do roteiro</h3>
              <div className="mt-3 grid gap-3">
                <label className="text-sm">
                  Data
                  <input
                    required
                    type="date"
                    value={dataRota}
                    onChange={(e) => setDataRota(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                  />
                </label>
                <label className="text-sm">
                  Entregador
                  <select
                    required
                    value={entregadorId}
                    onChange={(e) => setEntregadorId(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                  >
                    <option value="">Selecione</option>
                    {drivers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Veículo
                  <select
                    required
                    value={veiculoId}
                    onChange={(e) => setVeiculoId(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                  >
                    <option value="">Selecione</option>
                    {vehicles.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.placa} {item.modelo || ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Observações
                  <textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                  />
                </label>
              </div>
            </section>

            <DeliverySourceSearch
              onSelect={selectSuggestion}
              onOther={() => {
                setDraft({ ...emptyStop(), origem: "OUTRO" });
                setManualOpen(true);
              }}
            />

            {manualOpen && (
              <form
                onSubmit={(event) => {
                  addStop(event);
                  setManualOpen(false);
                }}
                className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <h3 className="font-bold">Outra entrega</h3>
                <div className="mt-3 grid gap-3">
                  <label className="text-sm">
                    Cliente
                    <input
                      required
                      value={draft.clienteNome}
                      onChange={(e) =>
                        setDraft({ ...draft, clienteNome: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                    />
                  </label>
                  <label className="text-sm">
                    Endereço
                    <input
                      required
                      value={draft.enderecoEntrega}
                      onChange={(e) =>
                        setDraft({ ...draft, enderecoEntrega: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Bairro"
                      value={draft.bairro}
                      onChange={(e) =>
                        setDraft({ ...draft, bairro: e.target.value })
                      }
                      className="rounded-xl border bg-transparent p-2.5 text-sm"
                    />
                    <input
                      placeholder="Cidade"
                      value={draft.cidade}
                      onChange={(e) =>
                        setDraft({ ...draft, cidade: e.target.value })
                      }
                      className="rounded-xl border bg-transparent p-2.5 text-sm"
                    />
                  </div>
                  <input
                    placeholder="UF"
                    maxLength={2}
                    value={draft.uf}
                    onChange={(e) =>
                      setDraft({ ...draft, uf: e.target.value.toUpperCase() })
                    }
                    className="rounded-xl border bg-transparent p-2.5 text-sm"
                  />
                  <textarea
                    rows={2}
                    placeholder="Observação da parada"
                    value={draft.observacaoRota}
                    onChange={(e) =>
                      setDraft({ ...draft, observacaoRota: e.target.value })
                    }
                    className="rounded-xl border bg-transparent p-2.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setManualOpen(false)}
                      className="flex-1 rounded-xl border px-4 py-2.5"
                    >
                      Cancelar
                    </button>
                    <button className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white">
                      Adicionar
                    </button>
                  </div>
                </div>
              </form>
            )}
          </aside>

          <section className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">Sequência de entregas</h3>
                <p className="text-xs text-slate-500">
                  Arraste os cartões ou use as setas.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold dark:bg-slate-800">
                {stops.length}
              </span>
            </div>
            {error && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {stops.map((stop, index) => (
                <article
                  key={stop.localId}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropAt(index)}
                  className="rounded-2xl border p-3 shadow-sm dark:border-slate-700"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical
                      className="mt-1 shrink-0 cursor-grab text-slate-400"
                      size={17}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-red-600">
                        {index + 1}º · {stop.origem} {stop.origemNumero}
                      </p>
                      <h4
                        className="truncate font-bold"
                        title={stop.clienteNome}
                      >
                        {stop.clienteNome}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {[
                          stop.enderecoEntrega,
                          stop.bairro,
                          stop.cidade,
                          stop.uf,
                        ]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                      {stop.observacaoRota && (
                        <p className="mt-2 line-clamp-2 text-xs">
                          {stop.observacaoRota}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="rounded-lg border p-1.5 disabled:opacity-30"
                      aria-label="Mover para cima"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === stops.length - 1}
                      className="rounded-lg border p-1.5 disabled:opacity-30"
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStops((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="rounded-lg p-1.5 text-red-600"
                      aria-label="Remover parada"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
              {!stops.length && (
                <div className="col-span-full grid min-h-64 place-items-center rounded-2xl border-2 border-dashed text-center text-sm text-slate-500">
                  Adicione OS ou pedidos para montar o roteiro.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
