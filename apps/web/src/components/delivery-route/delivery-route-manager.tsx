"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  LoaderCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DeliveryRouteBuilder } from "./delivery-route-builder";
import { DeliveryActions } from "./delivery-actions";

type Driver = {
  id: string;
  nome: string;
};

type Vehicle = {
  id: string;
  placa: string;
  modelo?: string | null;
};

type Delivery = {
  id: string;
  origem: string;
  origemNumero?: string | null;
  clienteNome?: string | null;
  enderecoEntrega?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  status: string;
  ordemExecucao: number;
  isReentrega: boolean;
  roteiroId?: string | null;
  entregador?: Driver | null;
  veiculo?: Vehicle | null;
};

type DeliverySource = {
  origem: "OS" | "PEDIDO";
  numero?: string | null;
  ordemServicoId?: string | null;
  clienteNome?: string | null;
  enderecoEntrega?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
};

type DeliveryForm = {
  dataEntrega: string;
  origem: "OS" | "PEDIDO" | "OUTRO";
  origemNumero: string;
  clienteNome: string;
  enderecoEntrega: string;
  bairro: string;
  cidade: string;
  uf: string;
  entregadorId: string;
  veiculoId: string;
  ordemExecucao: number;
  observacaoRota: string;
};

type Dashboard = {
  indicadores: {
    total: number;
    agendadas: number;
    emRota: number;
    entregues: number;
    naoEntregues: number;
    devolvidas: number;
    ocorrencias: number;
    canceladas: number;
  };
  entregas: Delivery[];
};

const today = new Date().toISOString().slice(0, 10);

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
  let body: unknown = {};

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Falha ao carregar o roteiro";

    throw new Error(message);
  }

  return body as T;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Agendado:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    "Em Rota": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    Entregue:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    "Não Entregue": "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    Cancelado:
      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        colors[status] ?? colors.Agendado
      }`}
    >
      {status}
    </span>
  );
}

export function DeliveryRouteManager({ canManage }: { canManage: boolean }) {
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState("");
  const [driverId, setDriverId] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [form, setForm] = useState<DeliveryForm>({
    dataEntrega: today,
    origem: "OS",
    origemNumero: "",
    clienteNome: "",
    enderecoEntrega: "",
    bairro: "",
    cidade: "",
    uf: "RJ",
    entregadorId: "",
    veiculoId: "",
    ordemExecucao: 1,
    observacaoRota: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({ data: date });

      if (status) query.set("status", status);
      if (driverId) query.set("entregadorId", driverId);

      const [panel, driverList, vehicleList] = await Promise.all([
        api<Dashboard>(`?${query.toString()}`),
        api<Driver[]>("/entregadores"),
        api<Vehicle[]>("/veiculos"),
      ]);

      setDashboard(panel);
      setDrivers(driverList);
      setVehicles(vehicleList);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Falha ao carregar o roteiro",
      );
    } finally {
      setLoading(false);
    }
  }, [date, driverId, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function lookupSource() {
    if (form.origem === "OUTRO" || !form.origemNumero.trim()) return;
    setLookingUp(true);
    setError("");
    try {
      const query = new URLSearchParams({
        origem: form.origem,
        numero: form.origemNumero.trim(),
      });
      const source = await api<DeliverySource>(`/origem?${query.toString()}`);
      setForm((current) => ({
        ...current,
        origemNumero: source.numero || current.origemNumero,
        clienteNome: source.clienteNome || "",
        enderecoEntrega: source.enderecoEntrega || "",
        bairro: source.bairro || "",
        cidade: source.cidade || "",
        uf: source.uf || current.uf,
      }));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Origem não encontrada",
      );
    } finally {
      setLookingUp(false);
    }
  }

  async function createDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/entregas", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          entregadorId: form.entregadorId
            ? Number(form.entregadorId)
            : undefined,
          veiculoId: form.veiculoId ? Number(form.veiculoId) : undefined,
          uf: form.uf.toUpperCase(),
        }),
      });
      setDate(form.dataEntrega);
      setOpen(false);
      setForm((current) => ({
        ...current,
        origemNumero: "",
        clienteNome: "",
        enderecoEntrega: "",
        bairro: "",
        cidade: "",
        ordemExecucao: 1,
        observacaoRota: "",
      }));
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Falha ao criar entrega",
      );
    } finally {
      setSaving(false);
    }
  }

  const indicators = dashboard?.indicadores;

  const cards = [
    {
      label: "Total",
      value: indicators?.total ?? 0,
      icon: Truck,
      color: "text-slate-700 dark:text-slate-200",
      filter: "",
    },
    {
      label: "Agendadas",
      value: indicators?.agendadas ?? 0,
      icon: Clock3,
      color: "text-amber-600",
      filter: "Agendado",
    },
    {
      label: "Em rota",
      value: indicators?.emRota ?? 0,
      icon: Truck,
      color: "text-blue-600",
      filter: "Em Rota",
    },
    {
      label: "Entregues",
      value: indicators?.entregues ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
      filter: "Entregue",
    },
    {
      label: "Ocorrências",
      value: indicators?.ocorrencias ?? 0,
      icon: CircleX,
      color: "text-red-600",
      filter: "OCORRENCIAS",
    },
  ];

  return (
    <main className="mx-auto max-w-[1600px] p-4 md:p-6">
      <PageHeader
        section="Estoque e Logística"
        title="Roteiro de Entrega"
        description="Planejamento, execução e acompanhamento diário das entregas."
        actions={
          <>
            {canManage && (
              <button
                type="button"
                onClick={() => setBuilderOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                <Plus size={17} />
                Montar roteiro
              </button>
            )}

            <a
              href={`/api/estoque-logistica/roteiro-entrega/roteiros/pdf?data=${encodeURIComponent(date)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              <Printer size={17} />
              Imprimir todos
            </a>
          </>
        }
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, color, filter }) => (
          <button
            type="button"
            onClick={() => setStatus(filter)}
            key={label}
            className={`rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950 ${status === filter ? "border-red-500 ring-2 ring-red-100 dark:ring-red-950" : "border-slate-200 dark:border-slate-800"}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <Icon size={20} className={color} />
            </div>

            <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
          </button>
        ))}
      </section>

      <section className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Data
          </span>

          <div className="flex items-center gap-2">
            <CalendarDays size={17} className="text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-xl border bg-transparent px-3 py-2"
            />
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Status
          </span>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-w-44 rounded-xl border bg-transparent px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="Agendado">Agendado</option>
            <option value="Em Rota">Em Rota</option>
            <option value="Entregue">Entregue</option>
            <option value="Não Entregue">Não Entregue</option>
            <option value="OCORRENCIAS">Ocorrências</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Entregador
          </span>

          <select
            value={driverId}
            onChange={(event) => setDriverId(event.target.value)}
            className="min-w-56 rounded-xl border bg-transparent px-3 py-2"
          >
            <option value="">Todos</option>

            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.nome}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw size={17} />
          Atualizar
        </button>

        <p className="ml-auto text-xs text-slate-500">
          {vehicles.length} veículo(s) ativo(s)
        </p>
      </section>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Carregando roteiro...
          </div>
        ) : !dashboard?.entregas.length ? (
          <div className="p-10 text-center text-slate-500">
            Nenhuma entrega encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Ordem</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Cliente e destino</th>
                  <th className="px-4 py-3">Entregador</th>
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {dashboard.entregas.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-4 py-4 font-bold">
                      {delivery.ordemExecucao}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold">
                        {delivery.origem} {delivery.origemNumero ?? ""}
                      </p>

                      {delivery.isReentrega && (
                        <span className="text-xs font-semibold text-amber-600">
                          Reentrega
                        </span>
                      )}
                    </td>

                    <td className="max-w-xl px-4 py-4">
                      <p className="font-semibold">
                        {delivery.clienteNome || "Cliente não informado"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {[
                          delivery.enderecoEntrega,
                          delivery.bairro,
                          delivery.cidade,
                          delivery.uf,
                        ]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      {delivery.entregador?.nome || "Não definido"}
                    </td>

                    <td className="px-4 py-4">
                      {delivery.veiculo
                        ? `${delivery.veiculo.placa} ${
                            delivery.veiculo.modelo ?? ""
                          }`
                        : "Não definido"}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={delivery.status} />
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {delivery.roteiroId && (
                          <a
                            href={`/api/estoque-logistica/roteiro-entrega/roteiros/${delivery.roteiroId}/pdf?data=${encodeURIComponent(date)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border p-1.5"
                            title="Imprimir roteiro do motorista"
                            aria-label="Imprimir roteiro do motorista"
                          >
                            <Printer size={15} />
                          </a>
                        )}
                        <DeliveryActions
                          delivery={delivery}
                          canManage={canManage}
                          onChanged={load}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {builderOpen && (
        <DeliveryRouteBuilder
          initialDate={date}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setBuilderOpen(false)}
          onCompleted={async (routeDate) => {
            setDate(routeDate);
            await load();
          }}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form
            onSubmit={createDelivery}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-delivery-title"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="new-delivery-title" className="text-xl font-bold">
                  Nova entrega
                </h2>
                <p className="text-sm text-slate-500">
                  Vincule uma OS ou pedido, entregador, veículo e sequência.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border p-2"
                aria-label="Fechar formulário"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="text-sm">
                Data da entrega
                <input
                  required
                  type="date"
                  value={form.dataEntrega}
                  onChange={(e) =>
                    setForm({ ...form, dataEntrega: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                />
              </label>
              <label className="text-sm">
                Origem
                <select
                  value={form.origem}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      origem: e.target.value as DeliveryForm["origem"],
                      origemNumero: "",
                    })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                >
                  <option value="OS">Ordem de Serviço</option>
                  <option value="PEDIDO">Pedido de Venda</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>
              <label className="text-sm">
                Número da origem
                <div className="mt-1 flex gap-2">
                  <input
                    required={form.origem !== "OUTRO"}
                    value={form.origemNumero}
                    onChange={(e) =>
                      setForm({ ...form, origemNumero: e.target.value })
                    }
                    className="min-w-0 flex-1 rounded-xl border bg-transparent p-2.5"
                  />
                  {form.origem !== "OUTRO" && (
                    <button
                      type="button"
                      onClick={() => void lookupSource()}
                      disabled={lookingUp || !form.origemNumero.trim()}
                      className="rounded-xl border px-3 disabled:opacity-50"
                      title="Buscar origem"
                    >
                      {lookingUp ? (
                        <LoaderCircle className="animate-spin" size={17} />
                      ) : (
                        <Search size={17} />
                      )}
                    </button>
                  )}
                </div>
              </label>
              <label className="text-sm md:col-span-2">
                Cliente
                <input
                  required
                  value={form.clienteNome}
                  onChange={(e) =>
                    setForm({ ...form, clienteNome: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                />
              </label>
              <label className="text-sm">
                Ordem
                <input
                  required
                  type="number"
                  min="1"
                  max="999"
                  value={form.ordemExecucao}
                  onChange={(e) =>
                    setForm({ ...form, ordemExecucao: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                />
              </label>
              <label className="text-sm md:col-span-3">
                Endereço de entrega
                <input
                  required
                  value={form.enderecoEntrega}
                  onChange={(e) =>
                    setForm({ ...form, enderecoEntrega: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                />
              </label>
              <label className="text-sm">
                Bairro
                <input
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                />
              </label>
              <label className="text-sm">
                Cidade
                <input
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                />
              </label>
              <label className="text-sm">
                UF
                <input
                  maxLength={2}
                  value={form.uf}
                  onChange={(e) =>
                    setForm({ ...form, uf: e.target.value.toUpperCase() })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                />
              </label>
              <label className="text-sm">
                Entregador
                <select
                  required
                  value={form.entregadorId}
                  onChange={(e) =>
                    setForm({ ...form, entregadorId: e.target.value })
                  }
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
              <label className="text-sm md:col-span-2">
                Veículo
                <select
                  required
                  value={form.veiculoId}
                  onChange={(e) =>
                    setForm({ ...form, veiculoId: e.target.value })
                  }
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
              <label className="text-sm md:col-span-3">
                Observações da rota
                <textarea
                  rows={3}
                  value={form.observacaoRota}
                  onChange={(e) =>
                    setForm({ ...form, observacaoRota: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-2.5"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border px-4 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar entrega"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
