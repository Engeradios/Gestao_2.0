"use client";

import { useRouter } from "next/navigation";
import {
  OperationalRouteBoard,
  type RouteProfessional,
  type RouteSource,
  type RouteVisit as BoardVisit,
} from "./operational-route-board";

import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  LoaderCircle,
  MapPinned,
  Plus,
  FileDown,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Unit = "RJ" | "SP";
type Visit = {
  id: string;
  dataVisita: string;
  dataFim: string;
  tecnico: string;
  unidade: Unit;
  turno: string;
  tipo: string;
  status: string;
  observacoes?: string | null;
  ordemExecucao: number;
  servico?: { proposta?: string | null; cliente?: string | null } | null;
  preventiva?: { clienteNome?: string | null } | null;
};
type Source = RouteSource;
type Technician = RouteProfessional;
type Dispatch = {
  visitas: Visit[];
  servicos: Source[];
  preventivas: Source[];
  tecnicos: Technician[];
};
const statuses = [
  "Agendado",
  "Em Deslocamento",
  "Em Atendimento",
  "Realizado",
  "Frustrado",
  "Cancelado",
];
const today = () => new Date().toISOString().slice(0, 10);

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("Sessão expirada");
  if (!response.ok)
    throw new Error(
      (payload as { message?: string }).message || "Falha na operação",
    );
  return payload as T;
}

export default function OperationalRouteManager({
  canManage,
}: {
  canManage: boolean;
}) {
  const router = useRouter();
  const [unit, setUnit] = useState<Unit>("RJ");
  const [date, setDate] = useState(today());
  const [data, setData] = useState<Dispatch>({
    visitas: [],
    servicos: [],
    preventivas: [],
    tecnicos: [],
  });
  const [agenda, setAgenda] = useState<Visit[]>([]);
  const [tab, setTab] = useState<"despacho" | "agenda">("despacho");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tecnico: "",
    tipo: "OPERACIONAL",
    origemId: "",
    turno: "Diurno",
    ordemExecucao: 1,
    diasAfastamento: 1,
    observacoes: "",
  });
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dispatch, calendar] = await Promise.all([
        api<Dispatch>(
          `/api/operacional/roteiro/despacho?data=${date}&unidade=${unit}`,
        ),
        api<Visit[]>(
          `/api/operacional/roteiro/agenda?dataInicio=${date}&dataFim=${date}&unidade=${unit}`,
        ),
      ]);
      setData(dispatch);
      setAgenda(calendar);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Erro ao carregar roteiro";

      if (message === "Sessão expirada") {
        router.replace("/login");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [date, router, unit]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const source = useMemo(
    () => (form.tipo === "PREVENTIVA" ? data.preventivas : data.servicos),
    [data, form.tipo],
  );
  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        dataVisita: date,
        unidade: unit,
        tecnico: form.tecnico,
        tipo: form.tipo,
        turno: form.turno,
        ordemExecucao: form.ordemExecucao,
        observacoes: form.observacoes,
      };
      if (["OPERACIONAL", "PREVENTIVA"].includes(form.tipo))
        body.origemId = form.origemId;
      if (form.tipo === "AFASTADO") body.diasAfastamento = form.diasAfastamento;
      await api("/api/operacional/roteiro/visitas", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao agendar");
    } finally {
      setSaving(false);
    }
  }
  function prepareAssignment(
    professional: RouteProfessional,
    target: {
      tipo: "OPERACIONAL" | "PREVENTIVA" | "SEDE" | "AFASTADO";
      origemId: string;
    },
  ) {
    const nextOrder =
      data.visitas.filter(
        (visit) =>
          visit.tecnico === professional.nome && visit.tipo !== "AFASTADO",
      ).length + 1;

    setForm({
      tecnico: professional.nome,
      tipo: target.tipo,
      origemId: target.origemId,
      turno: "Diurno",
      ordemExecucao: nextOrder,
      diasAfastamento: 1,
      observacoes: "",
    });

    setOpen(true);
  }

  async function moveVisit(
    visit: BoardVisit,
    professional: RouteProfessional,
    order: number,
  ) {
    setError("");
    const snapshot = data;
    const targetOrder = Math.max(1, order);

    // Atualização otimista: reflete a movimentação antes da resposta da API.
    setData((current) => {
      const moving = current.visitas.find((item) => item.id === visit.id);
      if (!moving) return current;

      const sameProfessional = moving.tecnico === professional.nome;
      const nextVisits = current.visitas.map((item) => {
        if (item.id === visit.id) {
          return {
            ...item,
            tecnico: professional.nome,
            ordemExecucao: targetOrder,
          };
        }

        if (
          item.tecnico === professional.nome &&
          item.tipo !== "AFASTADO" &&
          item.ordemExecucao >= targetOrder
        ) {
          return { ...item, ordemExecucao: item.ordemExecucao + 1 };
        }

        if (
          !sameProfessional &&
          item.tecnico === moving.tecnico &&
          item.tipo !== "AFASTADO" &&
          item.ordemExecucao > moving.ordemExecucao
        ) {
          return { ...item, ordemExecucao: item.ordemExecucao - 1 };
        }

        return item;
      });

      return { ...current, visitas: nextVisits };
    });

    try {
      const originId =
        visit.tipo === "OPERACIONAL"
          ? visit.servicoId
          : visit.tipo === "PREVENTIVA"
            ? visit.preventivaId
            : undefined;

      const updated = await api<Visit>(
        `/api/operacional/roteiro/visitas/${visit.id}/mover`,
        {
          method: "PATCH",
          body: JSON.stringify({
            tecnico: professional.nome,
            tipo: visit.tipo,
            origemId: originId,
            turno: visit.turno,
            ordemExecucao: targetOrder,
          }),
        },
      );

      // Reconcilia o registro movimentado com a resposta oficial da API.
      setData((current) => ({
        ...current,
        visitas: current.visitas.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      }));
    } catch (e) {
      // Rollback integral se o servidor rejeitar a operação.
      setData(snapshot);
      setError(e instanceof Error ? e.message : "Erro ao mover atividade");
    }
  }

  async function changeStatus(v: Visit, status: string) {
    try {
      await api(`/api/operacional/roteiro/visitas/${v.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, observacoes: v.observacoes || "" }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }
  async function remove(v: Visit) {
    if (!confirm(`Excluir visita de ${v.tecnico}?`)) return;
    try {
      await api(`/api/operacional/roteiro/visitas/${v.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }
  async function completeAll() {
    if (
      !confirm(
        "Marcar todas as visitas operacionais e preventivas do dia como realizadas?",
      )
    )
      return;
    try {
      await api("/api/operacional/roteiro/concluir-todos", {
        method: "POST",
        body: JSON.stringify({ dataVisita: date, unidade: unit }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao concluir");
    }
  }
  const visits = tab === "despacho" ? data.visitas : agenda;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="text-red-600" />
            <h1 className="text-2xl font-bold">Roteiro Técnico</h1>
          </div>
          <p className="text-sm text-slate-500">
            Despacho diário, agenda e acompanhamento das visitas técnicas.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              Agendar
            </button>
            <button
              onClick={() => void completeAll()}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              <CheckCheck className="mr-2 inline h-4 w-4" />
              Concluir dia
            </button>
            <a
              href={`/api/operacional/roteiro/pdf?data=${encodeURIComponent(date)}&unidade=${encodeURIComponent(unit)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <FileDown className="mr-2 inline h-4 w-4" />
              Emitir roteiro em PDF
            </a>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-3 dark:bg-slate-900">
        <button
          onClick={() => setTab("despacho")}
          className={`rounded-lg px-4 py-2 text-sm ${tab === "despacho" ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
        >
          Despacho
        </button>
        <button
          type="button"
          onClick={() => setDate((current) => shiftDate(current, -1))}
          className="rounded-lg border p-2"
          title="Dia anterior"
          aria-label="Ver dia anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setDate(today())}
          className="rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Hoje
        </button>

        <button
          type="button"
          onClick={() => setDate((current) => shiftDate(current, 1))}
          className="rounded-lg border p-2"
          title="Próximo dia"
          aria-label="Ver próximo dia"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-lg border bg-transparent px-3 py-2 text-sm"
          aria-label="Escolher data do roteiro"
        />

        <button
          type="button"
          onClick={() => setTab("agenda")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === "agenda"
              ? "bg-violet-600 text-white"
              : "border bg-violet-50 text-violet-700"
          }`}
        >
          <CalendarRange className="mr-2 inline h-4 w-4" />
          Agenda de outros dias
        </button>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          className="rounded-lg border bg-transparent px-3 py-2 text-sm"
        >
          <option>RJ</option>
          <option>SP</option>
        </select>
        <button
          onClick={() => void load()}
          className="rounded-lg border p-2"
          title="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="rounded-xl border bg-white px-4 py-3 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Data selecionada
        </p>
        <p className="mt-1 font-bold capitalize">{formatDate(date)}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {tab === "despacho" && !loading && (
        <OperationalRouteBoard
          visits={data.visitas as BoardVisit[]}
          professionals={data.tecnicos}
          services={data.servicos}
          preventives={data.preventivas}
          canManage={canManage}
          onAssign={prepareAssignment}
          onMove={moveVisit}
          onRemove={async (visit) => {
            await remove(visit as Visit);
          }}
        />
      )}

      {tab === "agenda" && (
        <div className="overflow-hidden rounded-xl border bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="p-3">Ordem</th>
                  <th className="p-3">Técnico</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3">Turno</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <LoaderCircle className="mx-auto animate-spin" />
                    </td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      Nenhuma visita encontrada.
                    </td>
                  </tr>
                ) : (
                  visits.map((v) => (
                    <tr key={v.id}>
                      <td className="p-3">{v.ordemExecucao}</td>
                      <td className="p-3 font-semibold">
                        {v.tecnico}
                        <div className="text-xs text-slate-500">
                          {v.unidade}
                        </div>
                      </td>
                      <td className="p-3">
                        {v.servico?.proposta ||
                          v.preventiva?.clienteNome ||
                          v.tipo}
                        <div className="text-xs text-slate-500">
                          {v.servico?.cliente || v.observacoes}
                        </div>
                      </td>
                      <td className="p-3">{v.turno}</td>
                      <td className="p-3">
                        {canManage ? (
                          <select
                            value={v.status}
                            onChange={(e) =>
                              void changeStatus(v, e.target.value)
                            }
                            className="rounded-lg border bg-transparent px-2 py-1"
                          >
                            {statuses.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          v.status
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {canManage && (
                          <button
                            onClick={() => void remove(v)}
                            className="rounded-md p-2 text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form
            onSubmit={create}
            className="grid w-full max-w-xl gap-4 rounded-2xl bg-white p-5 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="text-red-600" />
              <h2 className="text-lg font-bold">Agendar visita</h2>
            </div>
            <label className="text-sm">
              Técnico
              <select
                required
                value={form.tecnico}
                onChange={(e) => setForm({ ...form, tecnico: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-transparent p-2"
              >
                <option value="">Selecione</option>
                {data.tecnicos.map((t) => (
                  <option key={t.id} value={t.nome}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Tipo
              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm({ ...form, tipo: e.target.value, origemId: "" })
                }
                className="mt-1 w-full rounded-lg border bg-transparent p-2"
              >
                {["OPERACIONAL", "PREVENTIVA", "SEDE", "AFASTADO"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            {["OPERACIONAL", "PREVENTIVA"].includes(form.tipo) && (
              <label className="text-sm">
                Origem
                <select
                  required
                  value={form.origemId}
                  onChange={(e) =>
                    setForm({ ...form, origemId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border bg-transparent p-2"
                >
                  <option value="">Selecione</option>
                  {source.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.proposta || s.clienteNome || s.cliente || s.id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Turno
                <select
                  value={form.turno}
                  onChange={(e) => setForm({ ...form, turno: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-transparent p-2"
                >
                  <option>Diurno</option>
                  <option>Noturno</option>
                </select>
              </label>
              <label className="text-sm">
                Ordem
                <input
                  type="number"
                  min="1"
                  value={form.ordemExecucao}
                  onChange={(e) =>
                    setForm({ ...form, ordemExecucao: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border bg-transparent p-2"
                />
              </label>
            </div>
            {form.tipo === "AFASTADO" && (
              <label className="text-sm">
                Dias de afastamento
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.diasAfastamento}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      diasAfastamento: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border bg-transparent p-2"
                />
              </label>
            )}
            <label className="text-sm">
              Observações
              <textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
                className="mt-1 w-full rounded-lg border bg-transparent p-2"
                rows={3}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border px-4 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
