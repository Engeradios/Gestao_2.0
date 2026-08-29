"use client";

import Link from "next/link";
import { Eye, ListChecks, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ServiceEditorModal } from "./service-editor-modal";
import { AdminServiceEditor } from "./admin-service-editor";

type Scalar = string | number | boolean | null | undefined;
type FormValue = Record<string, Scalar>;

type Service = {
  id: string;
  proposta: string | null;
  cliente: string;
  servicoAtividade: string | null;
  responsavel: string | null;
  prioridade: string | null;
  status: string;
  percentual: number | string;
  prazoFinal: string | null;
  dataAprovacao: string | null;
  preparacaoCompleta: boolean;
  pendenciasPreparacao: string[];
};

type ServicesResult = {
  itens: Service[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
};

type Dashboard = {
  total: number;
  ativos: number;
  atrasados: number;
  concluidos: number;
  cancelados: number;
  emDia: number;
  emAndamento: number;
  aguardandoCliente: number;
  faltaMaterial: number;
  planejamento: number;
};

type SortField =
  | "proposta"
  | "cliente"
  | "servicoAtividade"
  | "responsavel"
  | "prioridade"
  | "status"
  | "percentual"
  | "prazoFinal";

type ModalState = {
  type: "servico" | "andamento";
  value: FormValue;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api/operacional/" + path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const raw = await response.text();
  const body: unknown = raw ? JSON.parse(raw) : {};

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : "Falha na operação";

    throw new Error(message);
  }

  return body as T;
}

export default function OperationalServicesManager({
  canEdit,
  initialSituation = "",
}: {
  canEdit: boolean;
  initialSituation?: string;
}) {
  const [data, setData] = useState<ServicesResult | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [uf, setUf] = useState("");
  const [situacao, setSituacao] = useState(initialSituation);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [ordenar, setOrdenar] = useState<SortField>("prazoFinal");
  const [direcao, setDirecao] = useState<"asc" | "desc">("asc");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [adminServiceId, setAdminServiceId] = useState<string | null>(null);

  const query = useMemo(() => {
    const parameters = new URLSearchParams();

    if (busca.trim()) parameters.set("q", busca.trim());
    if (status) parameters.set("status", status);
    if (prioridade) parameters.set("prioridade", prioridade);
    if (responsavel.trim()) parameters.set("responsavel", responsavel.trim());
    if (uf) parameters.set("uf", uf);
    if (situacao) parameters.set("situacao", situacao);

    parameters.set("mostrarConcluidos", String(mostrarConcluidos));
    parameters.set("ordenar", ordenar);
    parameters.set("direcao", direcao);
    parameters.set("pagina", String(pagina));
    parameters.set("porPagina", String(porPagina));

    return parameters.toString();
  }, [
    busca,
    status,
    prioridade,
    responsavel,
    uf,
    situacao,
    mostrarConcluidos,
    ordenar,
    direcao,
    pagina,
    porPagina,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [services, metrics] = await Promise.all([
        request<ServicesResult>(`servicos?${query}`),
        request<Dashboard>("painel"),
      ]);

      setData(services);
      setDashboard(metrics);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar os serviços.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [load]);

  function sort(field: SortField) {
    setPagina(1);

    if (ordenar === field) {
      setDirecao((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setOrdenar(field);
    setDirecao("asc");
  }

  function clearFilters() {
    setBusca("");
    setStatus("");
    setPrioridade("");
    setResponsavel("");
    setUf("");
    setSituacao("");
    setPagina(1);
  }

  function selectSituacao(value: string) {
    setSituacao((current) => (current === value ? "" : value));
    setStatus("");
    setPagina(1);
  }

  function edit(service: Service) {
    setAdminServiceId(service.id);
  }

  const services = data?.itens ?? [];

  return (
    <main className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-semibold text-red-600">Engerádios Operacional</p>
          <h1 className="text-3xl font-bold">Serviços</h1>
          <p className="mt-1 text-sm text-slate-500">
            Planejamento, execução e acompanhamento operacional
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMostrarConcluidos((current) => !current);
              setPagina(1);
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              mostrarConcluidos
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "dark:border-slate-700"
            }`}
          >
            {mostrarConcluidos ? "Ocultar concluídos" : "Exibir concluídos"}
          </button>

          <Link
            href="/ordens-servico/painel"
            className="rounded-xl border px-4 py-2 text-sm font-semibold dark:border-slate-700"
          >
            Controle de OS
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SituationCard
          label="Em aberto"
          value={dashboard?.ativos ?? 0}
          active={situacao === ""}
          accent="slate"
          onClick={() => selectSituacao("")}
        />
        <SituationCard
          label="Atrasado"
          value={dashboard?.atrasados ?? 0}
          active={situacao === "atrasado"}
          accent="red"
          onClick={() => selectSituacao("atrasado")}
        />
        <SituationCard
          label="Em dia"
          value={dashboard?.emDia ?? 0}
          active={situacao === "em_dia"}
          accent="emerald"
          onClick={() => selectSituacao("em_dia")}
        />
        <SituationCard
          label="Em andamento"
          value={dashboard?.emAndamento ?? 0}
          active={situacao === "em_andamento"}
          accent="blue"
          onClick={() => selectSituacao("em_andamento")}
        />
        <SituationCard
          label="Planejamento"
          value={dashboard?.planejamento ?? 0}
          active={situacao === "planejamento"}
          accent="amber"
          onClick={() => selectSituacao("planejamento")}
        />
        <SituationCard
          label="Aguardando cliente"
          value={dashboard?.aguardandoCliente ?? 0}
          active={situacao === "aguardando_cliente"}
          accent="violet"
          onClick={() => selectSituacao("aguardando_cliente")}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SituationCard
          label="Falta material"
          value={dashboard?.faltaMaterial ?? 0}
          active={situacao === "falta_material"}
          accent="orange"
          onClick={() => selectSituacao("falta_material")}
        />
        <SituationCard
          label="Concluídos"
          value={dashboard?.concluidos ?? 0}
          active={situacao === "concluido"}
          accent="teal"
          onClick={() => selectSituacao("concluido")}
        />
        <Metric label="Filtrados" value={data?.total} color="violet" />
      </section>

      <section className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 lg:grid-cols-6">
          <input
            value={busca}
            onChange={(event) => {
              setBusca(event.target.value);
              setPagina(1);
            }}
            placeholder="Buscar proposta, cliente, serviço, contrato ou pedido"
            className="rounded-xl border px-4 py-3 lg:col-span-2 dark:border-slate-700 dark:bg-slate-900"
          />

          <Filter
            value={status}
            label="Todos os status"
            options={[
              "Planejamento",
              "Não iniciado",
              "Em andamento",
              "Aguardando Cliente",
              "Falta Material",
              "Concluído",
              "Cancelado",
            ]}
            change={(value) => {
              setStatus(value);
              setSituacao("");
              setPagina(1);
            }}
          />

          <Filter
            value={prioridade}
            label="Todas as prioridades"
            options={["Baixa", "Normal", "Alta", "Urgente"]}
            change={(value) => {
              setPrioridade(value);
              setPagina(1);
            }}
          />

          <input
            value={responsavel}
            onChange={(event) => {
              setResponsavel(event.target.value);
              setPagina(1);
            }}
            placeholder="Responsável"
            className="rounded-xl border px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          />

          <div className="flex gap-2">
            <Filter
              value={uf}
              label="UF"
              options={["RJ", "SP", "MG", "ES"]}
              change={(value) => {
                setUf(value);
                setPagina(1);
              }}
            />

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border px-4 py-3 text-sm font-semibold dark:border-slate-700"
            >
              Limpar
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <section className="overflow-hidden rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-slate-800">
          <span className="text-sm text-slate-500" aria-live="polite">
            {loading
              ? "Atualizando..."
              : `${data?.total ?? 0} serviço(s) encontrado(s)`}
          </span>

          <select
            value={porPagina}
            onChange={(event) => {
              setPorPagina(Number(event.target.value));
              setPagina(1);
            }}
            className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            aria-label="Registros por página"
          >
            {[25, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value} por página
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <caption className="sr-only">
              Serviços operacionais. Use os botões do cabeçalho para ordenar.
            </caption>
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <Header
                  field="proposta"
                  label="Proposta"
                  current={ordenar}
                  direction={direcao}
                  sort={sort}
                />
                <Header
                  field="cliente"
                  label="Cliente"
                  current={ordenar}
                  direction={direcao}
                  sort={sort}
                />
                <Header
                  field="servicoAtividade"
                  label="Serviço"
                  current={ordenar}
                  direction={direcao}
                  sort={sort}
                />
                <Header
                  field="responsavel"
                  label="Responsável"
                  current={ordenar}
                  direction={direcao}
                  sort={sort}
                />
                <Header
                  field="prioridade"
                  label="Prioridade"
                  current={ordenar}
                  direction={direcao}
                  sort={sort}
                />
                <Header
                  field="status"
                  label="Status"
                  current={ordenar}
                  direction={direcao}
                  sort={sort}
                />
                <Header
                  field="percentual"
                  label="Progresso"
                  current={ordenar}
                  direction={direcao}
                  sort={sort}
                />
                <th scope="col" className="px-4 py-3">
                  Aprovação
                </th>
                <th scope="col" className="px-4 py-3">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y dark:divide-slate-800">
              {services.map((service) => (
                <tr
                  key={service.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/70"
                >
                  <td className="px-4 py-4 font-semibold">
                    {service.proposta || "—"}
                  </td>
                  <td className="min-w-64 px-4 py-4">{service.cliente}</td>
                  <td className="max-w-lg px-4 py-4">
                    {service.servicoAtividade || "—"}
                  </td>
                  <td className="px-4 py-4">
                    {service.responsavel || "Não definido"}
                  </td>
                  <td className="px-4 py-4">
                    <Priority value={service.prioridade} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <Status value={service.status} />

                      {!service.preparacaoCompleta && (
                        <div
                          className="max-w-56"
                          title={`Pendências: ${service.pendenciasPreparacao.join(
                            ", ",
                          )}`}
                        >
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Preparação pendente
                          </span>

                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                            {service.pendenciasPreparacao.join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="min-w-36 px-4 py-4">
                    <Progress value={service.percentual} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {formatDate(service.dataAprovacao)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/operacional/servicos/${service.id}`}
                        title="Detalhes"
                        aria-label="Detalhes"
                        className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Eye size={18} />
                      </Link>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => edit(service)}
                          title="Editar"
                          aria-label="Editar"
                          className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                        >
                          <Pencil size={18} />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!service.preparacaoCompleta}
                        title={
                          service.preparacaoCompleta
                            ? "Registrar andamento"
                            : `Complete primeiro: ${service.pendenciasPreparacao.join(
                                ", ",
                              )}`
                        }
                        onClick={() => {
                          if (!service.preparacaoCompleta) return;

                          setModal({
                            type: "andamento",
                            value: {
                              servicoId: service.id,
                              descricao: "",
                              percentual: Number(service.percentual || 0),
                              status: service.status,
                            },
                          });
                        }}
                        aria-label="Andamento"
                        className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:disabled:bg-slate-900"
                      >
                        <ListChecks size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && services.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500">
                    Nenhum serviço encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between border-t px-4 py-4 dark:border-slate-800">
          <span className="text-sm text-slate-500">
            Página {data?.pagina ?? 1} de {data?.totalPaginas ?? 1}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagina <= 1 || loading}
              onClick={() => setPagina((value) => Math.max(1, value - 1))}
              className="rounded-lg border px-4 py-2 disabled:opacity-40 dark:border-slate-700"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina >= (data?.totalPaginas ?? 1) || loading}
              onClick={() => setPagina((value) => value + 1)}
              className="rounded-lg border px-4 py-2 disabled:opacity-40 dark:border-slate-700"
            >
              Próxima
            </button>
          </div>
        </footer>
      </section>

      {adminServiceId && (
        <AdminServiceEditor
          serviceId={adminServiceId}
          canEditType={canEdit}
          onClose={() => setAdminServiceId(null)}
          onSaved={() => {
            setAdminServiceId(null);
            void load();
          }}
        />
      )}

      {modal && (
        <ServiceEditorModal
          modal={modal}
          close={() => setModal(null)}
          done={() => {
            setModal(null);
            void load();
          }}
        />
      )}
    </main>
  );
}

function Header({
  field,
  label,
  current,
  direction,
  sort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  direction: "asc" | "desc";
  sort: (field: SortField) => void;
}) {
  const active = current === field;

  return (
    <th
      scope="col"
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : undefined
      }
      className="px-4 py-3"
    >
      <button
        type="button"
        onClick={() => sort(field)}
        className="flex items-center gap-2 font-semibold"
      >
        {label}
        <span aria-hidden="true">
          {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function Filter({
  value,
  label,
  options,
  change,
}: {
  value: string;
  label: string;
  options: string[];
  change: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => change(event.target.value)}
      className="rounded-xl border px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value?: number;
  color: "blue" | "red" | "green" | "gray" | "violet";
}) {
  const colors = {
    blue: "text-blue-600",
    red: "text-red-600",
    green: "text-emerald-600",
    gray: "text-slate-500",
    violet: "text-violet-600",
  };

  return (
    <article className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${colors[color]}`}>
        {value ?? "—"}
      </p>
    </article>
  );
}

function Status({ value }: { value: string }) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  let style = "bg-slate-100 text-slate-700";

  if (normalized.includes("CONCLUID"))
    style = "bg-emerald-100 text-emerald-700";
  else if (normalized.includes("ANDAMENTO"))
    style = "bg-blue-100 text-blue-700";
  else if (normalized.includes("PLANEJAMENTO"))
    style = "bg-violet-100 text-violet-700";
  else if (normalized.includes("AGUARDANDO"))
    style = "bg-amber-100 text-amber-800";
  else if (normalized.includes("MATERIAL"))
    style = "bg-orange-100 text-orange-700";
  else if (normalized.includes("CANCEL")) style = "bg-rose-100 text-rose-700";

  return (
    <span className={`rounded-full px-3 py-1 font-semibold ${style}`}>
      {value}
    </span>
  );
}

function Priority({ value }: { value: string | null }) {
  const priority = value || "Normal";
  const colors: Record<string, string> = {
    Urgente: "bg-red-100 text-red-700",
    Alta: "bg-orange-100 text-orange-700",
    Normal: "bg-blue-50 text-blue-700",
    Baixa: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[priority] || colors.Normal}`}
    >
      {priority}
    </span>
  );
}

function Progress({ value }: { value: number | string }) {
  const percentage = Math.max(
    0,
    Math.min(100, Math.round(Number(value || 0) * 100)),
  );

  return (
    <div>
      <span className="text-xs font-semibold">{percentage}%</span>
      <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-2 rounded-full ${
            percentage >= 100 ? "bg-emerald-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Não definido";

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("pt-BR");
}

function SituationCard({
  label,
  value,
  active,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  accent:
    | "slate"
    | "red"
    | "emerald"
    | "blue"
    | "amber"
    | "violet"
    | "orange"
    | "teal";
  onClick: () => void;
}) {
  const accents: Record<string, string> = {
    slate: "text-slate-700 dark:text-slate-200",
    red: "text-red-600",
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
    orange: "text-orange-600",
    teal: "text-teal-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${
        active
          ? "border-red-500 ring-2 ring-red-200 dark:ring-red-900"
          : "border-slate-200 dark:border-slate-800"
      } bg-white dark:bg-slate-950`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${accents[accent]}`}>{value}</p>
    </button>
  );
}
