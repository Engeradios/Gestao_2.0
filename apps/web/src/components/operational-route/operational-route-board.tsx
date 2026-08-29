"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Building2,
  Check,
  GripVertical,
  Search,
  Trash2,
  Umbrella,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

export type RouteProfessional = {
  id: string;
  nome: string;
  funcao?: string | null;
  unidade?: string | null;
  pessoaId?: string | null;
};

export type RouteSource = {
  id: string;
  proposta?: string | null;
  contrato?: string | null;
  cliente?: string | null;
  clienteNome?: string | null;
  clienteLocal?: string | null;
  localInstalacao?: string | null;
  servicoAtividade?: string | null;
  equipamento?: string | null;
  modelo?: string | null;
  dataProximaPreventiva?: string | null;
  status?: string | null;
};

export type RouteVisit = {
  id: string;
  tecnico: string;
  funcaoProfissional?: string | null;
  turno: string;
  tipo: string;
  status: string;
  observacoes?: string | null;
  ordemExecucao: number;
  servicoId?: string | null;
  preventivaId?: string | null;
  dataFim?: string;
};

type AssignmentTarget = {
  tipo: "OPERACIONAL" | "PREVENTIVA" | "SEDE" | "AFASTADO";
  origemId: string;
};

type SelectedTask = AssignmentTarget & { label: string };

export function OperationalRouteBoard({
  visits,
  professionals,
  services,
  preventives,
  canManage,
  onAssign,
  onMove,
  onRemove,
}: {
  visits: RouteVisit[];
  professionals: RouteProfessional[];
  services: RouteSource[];
  preventives: RouteSource[];
  canManage: boolean;
  onAssign: (professional: RouteProfessional, target: AssignmentTarget) => void;
  onMove: (
    visit: RouteVisit,
    professional: RouteProfessional,
    order: number,
  ) => Promise<void>;
  onRemove: (visit: RouteVisit) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [taskType, setTaskType] = useState<
    "TODOS" | "OPERACIONAL" | "PREVENTIVA"
  >("TODOS");
  const [selected, setSelected] = useState<SelectedTask | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const query = search.trim().toLocaleLowerCase("pt-BR");
  const serviceItems = useMemo(
    () =>
      services.filter((item) =>
        [item.proposta, item.cliente, item.clienteLocal, item.servicoAtividade]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(query),
      ),
    [query, services],
  );
  const preventiveItems = useMemo(
    () =>
      preventives.filter((item) =>
        [
          item.contrato,
          item.clienteNome,
          item.localInstalacao,
          item.equipamento,
          item.modelo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(query),
      ),
    [query, preventives],
  );
  const awayNames = useMemo(
    () =>
      new Set(
        visits
          .filter((visit) => visit.tipo === "AFASTADO")
          .map((visit) => visit.tecnico),
      ),
    [visits],
  );

  function assign(professionalId: string, target: AssignmentTarget) {
    if (!canManage) return;
    const professional = professionals.find(
      (item) => item.id === professionalId,
    );
    if (!professional || awayNames.has(professional.nome)) return;
    onAssign(professional, target);
    setSelected(null);
  }

  async function dragEnd(event: DragEndEvent) {
    const target = event.active.data.current?.target as
      AssignmentTarget | undefined;
    const draggedVisit = event.active.data.current?.visit as
      RouteVisit | undefined;
    const professionalId = event.over?.data.current?.professionalId;

    if (typeof professionalId !== "string") return;
    const professional = professionals.find(
      (item) => item.id === professionalId,
    );
    if (!professional || awayNames.has(professional.nome)) return;

    if (draggedVisit) {
      const targetVisits = visits.filter(
        (visit) =>
          visit.tecnico === professional.nome && visit.tipo !== "AFASTADO",
      );
      const order =
        draggedVisit.tecnico === professional.nome
          ? draggedVisit.ordemExecucao
          : targetVisits.length + 1;
      await onMove(draggedVisit, professional, order);
      return;
    }

    if (target) assign(professionalId, target);
  }

  const visibleTasks =
    (taskType === "TODOS"
      ? serviceItems.length + preventiveItems.length
      : taskType === "OPERACIONAL"
        ? serviceItems.length
        : preventiveItems.length) + 2;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => void dragEnd(event)}
    >
      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(320px,25%)_1fr]">
        <aside className="space-y-3 2xl:sticky 2xl:top-3">
          <section className="rounded-2xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-bold">Atividades disponíveis</h2>
                <p className="text-xs text-slate-500">
                  Arraste uma atividade ou selecione e clique no profissional.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold dark:bg-slate-800">
                {visibleTasks}
              </span>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Proposta, cliente, contrato..."
                className="w-full rounded-xl border bg-transparent py-2 pl-9 pr-3 text-sm dark:border-slate-700"
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              {(["TODOS", "OPERACIONAL", "PREVENTIVA"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTaskType(item)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-bold ${taskType === item ? "bg-white text-red-600 shadow-sm dark:bg-slate-800" : "text-slate-500"}`}
                >
                  {item === "TODOS"
                    ? "Todos"
                    : item === "OPERACIONAL"
                      ? "Serviços"
                      : "Preventivas"}
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 rounded-xl border border-violet-300 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200"
            >
              <span>
                <b>Selecionado:</b> {selected.label}. Clique no profissional.
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Cancelar seleção"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid max-h-[62vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-1">
            {(taskType === "TODOS" || taskType === "OPERACIONAL") &&
              serviceItems.map((source) => (
                <TaskCard
                  key={`OPERACIONAL-${source.id}`}
                  source={source}
                  type="OPERACIONAL"
                  selected={
                    selected?.tipo === "OPERACIONAL" &&
                    selected.origemId === source.id
                  }
                  canManage={canManage}
                  onSelect={setSelected}
                />
              ))}
            {(taskType === "TODOS" || taskType === "PREVENTIVA") &&
              preventiveItems.map((source) => (
                <TaskCard
                  key={`PREVENTIVA-${source.id}`}
                  source={source}
                  type="PREVENTIVA"
                  selected={
                    selected?.tipo === "PREVENTIVA" &&
                    selected.origemId === source.id
                  }
                  canManage={canManage}
                  onSelect={setSelected}
                />
              ))}
            <SpecialTask
              type="SEDE"
              label="Sede"
              detail="Atividade interna"
              icon={<Building2 className="h-4 w-4" />}
              selected={selected?.tipo === "SEDE"}
              canManage={canManage}
              onSelect={setSelected}
            />
            <SpecialTask
              type="AFASTADO"
              label="Afastamento"
              detail="Férias, falta ou atestado"
              icon={<Umbrella className="h-4 w-4" />}
              selected={selected?.tipo === "AFASTADO"}
              canManage={canManage}
              onSelect={setSelected}
            />
          </div>
        </aside>

        <section className="rounded-2xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-red-600" />
              <div>
                <h2 className="font-bold">Equipe do dia</h2>
                <p className="text-xs text-slate-500">
                  {professionals.length} profissionais • {visits.length}{" "}
                  alocações
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Cartões compactos para visualizar a equipe inteira.
            </p>
          </header>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1900px]:grid-cols-6">
            {professionals.map((professional) => (
              <ProfessionalCard
                key={professional.id}
                professional={professional}
                visits={visits
                  .filter((visit) => visit.tecnico === professional.nome)
                  .sort((a, b) => a.ordemExecucao - b.ordemExecucao)}
                away={awayNames.has(professional.nome)}
                disabled={!canManage}
                selected={selected}
                onSelectedAssign={() =>
                  selected && assign(professional.id, selected)
                }
                onMove={onMove}
                onRemove={onRemove}
              />
            ))}
          </div>
        </section>
      </div>
    </DndContext>
  );
}

function TaskCard({
  source,
  type,
  selected,
  canManage,
  onSelect,
}: {
  source: RouteSource;
  type: "OPERACIONAL" | "PREVENTIVA";
  selected: boolean;
  canManage: boolean;
  onSelect: (task: SelectedTask) => void;
}) {
  const reference = source.proposta || source.contrato || `#${source.id}`;
  const customer =
    source.cliente || source.clienteNome || "Cliente não informado";
  const detail =
    source.servicoAtividade ||
    [source.equipamento, source.modelo].filter(Boolean).join(" ") ||
    source.clienteLocal ||
    source.localInstalacao ||
    "Sem detalhes";
  const target: AssignmentTarget = { tipo: type, origemId: source.id };
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task:${type}:${source.id}`,
      disabled: !canManage,
      data: { target },
    });
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={() =>
        onSelect({ ...target, label: `${reference} • ${customer}` })
      }
      className={`group w-full rounded-xl border p-3 text-left shadow-sm transition ${selected ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200 dark:bg-violet-950/30" : type === "OPERACIONAL" ? "border-blue-200 bg-white hover:border-blue-500 dark:bg-slate-950" : "border-emerald-200 bg-white hover:border-emerald-500 dark:bg-slate-950"} ${isDragging ? "z-50 opacity-60 shadow-xl" : ""}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${type === "OPERACIONAL" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}
            >
              {reference}
            </span>
            {selected && <Check className="h-4 w-4 text-violet-600" />}
          </div>
          <p className="mt-1 truncate text-xs font-bold" title={customer}>
            {customer}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
            {detail}
          </p>
        </div>
      </div>
    </button>
  );
}

function SpecialTask({
  type,
  label,
  detail,
  icon,
  selected,
  canManage,
  onSelect,
}: {
  type: "SEDE" | "AFASTADO";
  label: string;
  detail: string;
  icon: React.ReactNode;
  selected: boolean;
  canManage: boolean;
  onSelect: (task: SelectedTask) => void;
}) {
  const target: AssignmentTarget = { tipo: type, origemId: "" };
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task:${type}`,
      disabled: !canManage,
      data: { target },
    });
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={() => onSelect({ ...target, label })}
      className={`flex items-center gap-2 rounded-xl border border-dashed p-3 text-left text-sm transition ${selected ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200" : type === "AFASTADO" ? "border-rose-300 bg-rose-50/60" : "border-slate-300 bg-slate-50"} ${isDragging ? "opacity-60" : ""}`}
    >
      {icon}
      <span>
        <b className="block">{label}</b>
        <small className="text-slate-500">{detail}</small>
      </span>
    </button>
  );
}

function ProfessionalCard({
  professional,
  visits,
  away,
  disabled,
  selected,
  onSelectedAssign,
  onMove,
  onRemove,
}: {
  professional: RouteProfessional;
  visits: RouteVisit[];
  away: boolean;
  disabled: boolean;
  selected: SelectedTask | null;
  onSelectedAssign: () => void;
  onMove: (
    visit: RouteVisit,
    professional: RouteProfessional,
    order: number,
  ) => Promise<void>;
  onRemove: (visit: RouteVisit) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `professional:${professional.id}`,
    disabled: disabled || away,
    data: { professionalId: professional.id },
  });

  async function changeOrder(visit: RouteVisit, direction: -1 | 1) {
    await onMove(
      visit,
      professional,
      Math.max(1, visit.ordemExecucao + direction),
    );
  }

  return (
    <article
      ref={setNodeRef}
      className={`min-h-32 rounded-xl border p-2.5 transition ${
        away
          ? "border-rose-200 bg-rose-50/70 opacity-70"
          : isOver
            ? "border-violet-500 bg-violet-50 ring-2 ring-violet-300 dark:bg-violet-950/30"
            : visits.length
              ? "border-amber-200 bg-amber-50/40 dark:bg-amber-950/10"
              : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
      }`}
    >
      <button
        type="button"
        disabled={disabled || away || !selected}
        onClick={onSelectedAssign}
        className="w-full text-left disabled:cursor-default"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className="truncate text-xs font-bold"
              title={professional.nome}
            >
              {professional.nome}
            </h3>
            <p className="truncate text-[10px] text-slate-500">
              {professional.funcao || "Função não definida"}
            </p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${away ? "bg-rose-200 text-rose-700" : visits.length ? "bg-amber-200 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}
          >
            {away ? "Afastado" : visits.length ? visits.length : "Livre"}
          </span>
        </div>
      </button>
      <div className="mt-2 space-y-1.5">
        {visits
          .filter((visit) => visit.tipo !== "AFASTADO")
          .map((visit) => (
            <VisitRow
              key={visit.id}
              visit={visit}
              canManage={!disabled}
              onMoveUp={() => void changeOrder(visit, -1)}
              onMoveDown={() => void changeOrder(visit, 1)}
              onRemove={onRemove}
            />
          ))}
        {!away && !visits.length && (
          <p className="rounded-lg border border-dashed py-4 text-center text-[10px] text-slate-400">
            Solte uma atividade
          </p>
        )}
        {away && (
          <p className="rounded-lg bg-rose-100 py-3 text-center text-[10px] font-semibold text-rose-700">
            Indisponível no período
          </p>
        )}
      </div>
    </article>
  );
}

function VisitRow({
  visit,
  canManage,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  visit: RouteVisit;
  canManage: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: (visit: RouteVisit) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `visit:${visit.id}`,
      disabled: !canManage,
      data: { visit },
    });
  const color =
    visit.tipo === "OPERACIONAL"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : visit.tipo === "PREVENTIVA"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 text-[10px] ${color} ${isDragging ? "z-50 opacity-60 shadow-xl" : ""}`}
    >
      {canManage && (
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
          aria-label={`Mover atividade ${visit.ordemExecucao} de ${visit.tecnico}`}
        >
          <GripVertical className="h-3 w-3" />
        </button>
      )}
      <span className="font-black">{visit.ordemExecucao}º</span>
      <span className="min-w-0 flex-1 truncate">
        {visit.tipo} • {visit.turno === "Noturno" ? "Noturno" : "Diurno"}
      </span>
      <span className="rounded bg-white/70 px-1 py-0.5">{visit.status}</span>
      {canManage && (
        <span className="flex items-center">
          <button
            type="button"
            onClick={onMoveUp}
            className="px-1 font-bold"
            aria-label="Subir atividade"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="px-1 font-bold"
            aria-label="Descer atividade"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => void onRemove(visit)}
            className="text-rose-600"
            aria-label={`Remover atividade de ${visit.tecnico}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}
