/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileWarning,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Preventive = {
  id: string;
  clienteNome: string;
  contrato?: string | null;
  vencimentoContrato?: string | null;
  equipamento?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  qtdTecnicos: number;
  frequenciaDias: number;
  dataUltimaPreventiva?: string | null;
  dataProximaPreventiva: string;
  tecnicoResponsavel?: string | null;
  observacoes?: string | null;
  statusCalculado?: string;
  diasRestantes?: number;
  contratoVencendo?: boolean;
  diasContrato?: number | null;
  roteiroVisitas?: Visit[];
};

type Visit = {
  id: string;
  dataVisita: string;
  tecnico: string;
  turno: string;
  status: string;
  observacoes?: string | null;
};

type Indicators = {
  total: number;
  emDia: number;
  atencao: number;
  atrasadas: number;
  contratosVencendo: number;
};

const emptyForm = {
  clienteNome: "",
  contrato: "",
  vencimentoContrato: "",
  equipamentos: [] as string[],
  equipamentoOutro: "",
  modelo: "",
  numeroSerie: "",
  qtdTecnicos: 1,
  frequenciaDias: 30,
  dataUltimaPreventiva: "",
  dataProximaPreventiva: "",
  tecnicoResponsavel: "",
  observacoes: "",
};

const systems = ["CFTV", "ALARME", "GPS INDOOR", "RÁDIO", "CÂMERA CORPORAL"];
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(value),
      )
    : "—";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) window.location.href = "/login";
  if (!response.ok) throw new Error(payload.message || "Falha na operação");
  return payload;
}

export default function PreventivesManager({
  canManage,
}: {
  canManage: boolean;
}) {
  const [items, setItems] = useState<Preventive[]>([]);
  const [indicators, setIndicators] = useState<Indicators>({
    total: 0,
    emDia: 0,
    atencao: 0,
    atrasadas: 0,
    contratosVencendo: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [history, setHistory] = useState<Preventive | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("busca", search.trim());
      if (status) params.set("status", status);
      params.set("limite", "200");
      const [list, kpis] = await Promise.all([
        api<{ itens: Preventive[] }>(`/api/operacional/preventivas?${params}`),
        api<Indicators>("/api/operacional/preventivas/indicadores"),
      ]);
      setItems(list.itens);
      setIndicators(kpis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar preventivas");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(item: Preventive) {
    const known = (item.equipamento || "")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => systems.includes(x));
    const other = (item.equipamento || "")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x && !systems.includes(x))
      .join(", ");
    setEditingId(item.id);
    setForm({
      clienteNome: item.clienteNome,
      contrato: item.contrato || "",
      vencimentoContrato: item.vencimentoContrato?.slice(0, 10) || "",
      equipamentos: known,
      equipamentoOutro: other,
      modelo: item.modelo || "",
      numeroSerie: item.numeroSerie || "",
      qtdTecnicos: item.qtdTecnicos || 1,
      frequenciaDias: item.frequenciaDias || 30,
      dataUltimaPreventiva: item.dataUltimaPreventiva?.slice(0, 10) || "",
      dataProximaPreventiva: item.dataProximaPreventiva?.slice(0, 10) || "",
      tecnicoResponsavel: item.tecnicoResponsavel || "",
      observacoes: item.observacoes || "",
    });
    setFormOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const equipamentos = [
        ...form.equipamentos,
        ...form.equipamentoOutro
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ];
      await api(
        `/api/operacional/preventivas${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({ ...form, equipamentos }),
        },
      );
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Preventive) {
    if (!confirm(`Excluir a preventiva de ${item.clienteNome}?`)) return;
    try {
      await api(`/api/operacional/preventivas/${item.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  async function showHistory(item: Preventive) {
    setHistoryOpen(true);
    setHistory(null);
    try {
      setHistory(
        await api<Preventive>(`/api/operacional/preventivas/${item.id}`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar histórico");
    }
  }

  const cards = [
    [
      "Registros",
      indicators.total,
      ClipboardList,
      "text-slate-700 bg-slate-100",
    ],
    [
      "Em dia",
      indicators.emDia,
      CheckCircle2,
      "text-emerald-700 bg-emerald-100",
    ],
    [
      "Atenção (30d)",
      indicators.atencao,
      AlertTriangle,
      "text-amber-700 bg-amber-100",
    ],
    [
      "Atrasadas",
      indicators.atrasadas,
      CalendarClock,
      "text-rose-700 bg-rose-100",
    ],
    [
      "Contratos vencendo",
      indicators.contratosVencendo,
      FileWarning,
      "text-orange-700 bg-orange-100",
    ],
  ] as const;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Preventivas
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Contratos, vencimentos e histórico integrado ao Roteiro Técnico.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Nova preventiva
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, Icon, color]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
              <span className={`rounded-lg p-2.5 ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, contrato, sistema ou modelo"
            className="w-full rounded-lg border border-slate-300 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option>Atrasada</option>
          <option>Atenção</option>
          <option>Em Dia</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cliente / contrato</th>
                <th className="px-4 py-3">Sistemas</th>
                <th className="px-4 py-3">Téc.</th>
                <th className="px-4 py-3">Frequência</th>
                <th className="px-4 py-3">Preventiva</th>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Nenhuma preventiva encontrada.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const statusClass =
                    item.statusCalculado === "Atrasada"
                      ? "bg-rose-100 text-rose-700"
                      : item.statusCalculado === "Atenção"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700";
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass}`}
                        >
                          {item.statusCalculado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{item.clienteNome}</p>
                        <p className="text-xs text-slate-500">
                          {item.contrato || "Sem contrato"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{item.equipamento || "—"}</p>
                        <p className="text-xs text-slate-500">
                          {item.modelo || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.qtdTecnicos}
                      </td>
                      <td className="px-4 py-3">{item.frequenciaDias} dias</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {formatDate(item.dataProximaPreventiva)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Última: {formatDate(item.dataUltimaPreventiva)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{formatDate(item.vencimentoContrato)}</p>
                        {item.contratoVencendo && (
                          <span className="text-xs font-semibold text-orange-600">
                            {(item.diasContrato ?? 0) < 0
                              ? "Vencido"
                              : `Vence em ${item.diasContrato}d`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            title="Histórico"
                            onClick={() => void showHistory(item)}
                            className="rounded-md p-2 text-sky-600 hover:bg-sky-50"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                title="Editar"
                                onClick={() => openEdit(item)}
                                className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                title="Excluir"
                                onClick={() => void remove(item)}
                                className="rounded-md p-2 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4 dark:bg-slate-900">
              <h2 className="font-bold">
                {editingId ? "Editar preventiva" : "Nova preventiva"}
              </h2>
              <button onClick={() => setFormOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={save} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Cliente *">
                <input
                  required
                  value={form.clienteNome}
                  onChange={(e) =>
                    setForm({ ...form, clienteNome: e.target.value })
                  }
                />
              </Field>
              <Field label="Contrato / referência">
                <input
                  value={form.contrato}
                  onChange={(e) =>
                    setForm({ ...form, contrato: e.target.value })
                  }
                />
              </Field>
              <Field label="Vencimento do contrato">
                <input
                  type="date"
                  value={form.vencimentoContrato}
                  onChange={(e) =>
                    setForm({ ...form, vencimentoContrato: e.target.value })
                  }
                />
              </Field>
              <Field label="Quantidade de técnicos">
                <input
                  type="number"
                  min="1"
                  value={form.qtdTecnicos}
                  onChange={(e) =>
                    setForm({ ...form, qtdTecnicos: Number(e.target.value) })
                  }
                />
              </Field>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Sistemas envolvidos
                </label>
                <div className="flex flex-wrap gap-3">
                  {systems.map((system) => (
                    <label
                      key={system}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.equipamentos.includes(system)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            equipamentos: e.target.checked
                              ? [...form.equipamentos, system]
                              : form.equipamentos.filter((x) => x !== system),
                          })
                        }
                      />
                      {system}
                    </label>
                  ))}
                </div>
              </div>
              <Field label="Outros sistemas">
                <input
                  value={form.equipamentoOutro}
                  onChange={(e) =>
                    setForm({ ...form, equipamentoOutro: e.target.value })
                  }
                  placeholder="Separar por vírgulas"
                />
              </Field>
              <Field label="Modelo / detalhes">
                <input
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                />
              </Field>
              <Field label="Número de série">
                <input
                  value={form.numeroSerie}
                  onChange={(e) =>
                    setForm({ ...form, numeroSerie: e.target.value })
                  }
                />
              </Field>
              <Field label="Técnico responsável">
                <input
                  value={form.tecnicoResponsavel}
                  onChange={(e) =>
                    setForm({ ...form, tecnicoResponsavel: e.target.value })
                  }
                />
              </Field>
              <Field label="Frequência (dias)">
                <input
                  type="number"
                  min="1"
                  value={form.frequenciaDias}
                  onChange={(e) =>
                    setForm({ ...form, frequenciaDias: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Última preventiva">
                <input
                  type="date"
                  value={form.dataUltimaPreventiva}
                  onChange={(e) => {
                    const date = e.target.value;
                    const next = date ? new Date(`${date}T00:00:00Z`) : null;
                    if (next)
                      next.setUTCDate(next.getUTCDate() + form.frequenciaDias);
                    setForm({
                      ...form,
                      dataUltimaPreventiva: date,
                      dataProximaPreventiva:
                        next?.toISOString().slice(0, 10) ||
                        form.dataProximaPreventiva,
                    });
                  }}
                />
              </Field>
              <Field label="Próxima preventiva *">
                <input
                  required
                  type="date"
                  value={form.dataProximaPreventiva}
                  onChange={(e) =>
                    setForm({ ...form, dataProximaPreventiva: e.target.value })
                  }
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Observações">
                  <textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm({ ...form, observacoes: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4 dark:bg-slate-900">
              <div>
                <h2 className="font-bold">Histórico de visitas</h2>
                <p className="text-xs text-slate-500">
                  {history?.clienteNome || "Carregando..."}
                </p>
              </div>
              <button onClick={() => setHistoryOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              {!history ? (
                <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
              ) : !history.roteiroVisitas?.length ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Nenhuma visita registrada no roteiro.
                </p>
              ) : (
                history.roteiroVisitas.map((visit) => (
                  <div key={visit.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-sky-600" />
                        <strong>{formatDate(visit.dataVisita)}</strong>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                        {visit.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">
                      {visit.tecnico} · {visit.turno}
                    </p>
                    {visit.observacoes && (
                      <p className="mt-2 text-sm text-slate-500">
                        {visit.observacoes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement<{ className?: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
        {label}
      </span>
      <span className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:bg-transparent [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:bg-transparent [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm">
        {children}
      </span>
    </label>
  );
}
