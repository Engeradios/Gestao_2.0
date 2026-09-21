/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
} from "@/components/ui/base";
import { PageHeader } from "@/components/layout/page-header";

type Finance = {
  contrato: number;
  orcado: number;
  realizado: number;
  impostos: number;
  lucroLiquido: number;
  margemLiquida: number;
  execucaoOrcamento: number;
  desvio: number;
};
type Project = {
  id: number;
  nome: string;
  cliente?: string;
  cliente_local?: string;
  uf?: string;
  status?: string;
  tipo_escopo?: string;
  numero_contrato?: string;
  numero_pedido?: string;
  gerente?: string;
  aprovacao_status?: "NAO_SUBMETIDO" | "PENDENTE" | "APROVADO" | "REJEITADO";
  versao: number;
  aprovado_em?: string | null;
  aprovado_por_id?: string | null;
  financeiro: Finance;
  _count?: { gp_os: number; gp_material: number; gp_relatorio: number };
};
type Dashboard = {
  projetos: number;
  emExecucao: number;
  carteira: number;
  lucroLiquido: number;
  porStatus: Record<string, number>;
};

type ExecutiveIndicator =
  | "VERDE"
  | "AMARELO"
  | "VERMELHO"
  | "CINZA"
  | string;

type ExecutiveSummaryV2 = {
  total_projetos: number;
  projetos_em_execucao: number;
  projetos_atrasados: number;
  projetos_vencendo_hoje: number;
  projetos_vencendo_30_dias: number;
  projetos_sem_gerente: number;
  projetos_sem_marcos: number;
  projetos_sem_materiais: number;
  projetos_realizado_sem_orcamento: number;
  projetos_com_divergencia_os: number;
  valor_total_contratos: number;
  valor_total_orcado: number;
  valor_total_realizado: number;
  saldo_total_orcamento: number;
  total_os: number;
  total_os_encerradas: number;
  total_os_abertas: number;
  total_os_encerradas_sem_data: number;
  total_relatorios: number;
  total_relatorios_rascunho: number;
};

type ExecutivePanelV2 = {
  projeto_id: number;
  codigo?: string | null;
  nome: string;
  cliente?: string | null;
  cliente_local?: string | null;
  uf?: string | null;
  gerente?: string | null;
  status?: string | null;
  aprovacao_status?: string | null;
  tipo_escopo?: string | null;
  numero_contrato?: string | null;
  numero_pedido?: string | null;
  valor_contrato: number;
  data_inicio?: string | null;
  data_fim_prev?: string | null;
  data_fim_real?: string | null;
  total_custos: number;
  valor_orcado: number;
  valor_realizado: number;
  saldo_orcamento: number;
  percentual_orcamento_consumido: number;
  total_marcos: number;
  progresso_medio: number;
  menor_percentual_marco: number;
  maior_percentual_marco: number;
  total_materiais: number;
  quantidade_prevista: number;
  quantidade_entregue: number;
  valor_previsto_material: number;
  percentual_material_entregue: number;
  total_os: number;
  os_encerradas: number;
  os_abertas: number;
  os_encerradas_sem_data: number;
  os_abertas_com_data: number;
  percentual_os_encerradas: number;
  total_relatorios: number;
  relatorios_inicio: number;
  relatorios_fim: number;
  relatorios_rascunho: number;
  indicador_financeiro?: ExecutiveIndicator | null;
  indicador_progresso?: ExecutiveIndicator | null;
  indicador_material?: ExecutiveIndicator | null;
  indicador_os?: ExecutiveIndicator | null;
  indicador_prazo?: ExecutiveIndicator | null;
  alerta_sem_gerente: boolean | number;
  alerta_realizado_sem_orcamento: boolean | number;
  alerta_sem_marcos: boolean | number;
  alerta_sem_materiais: boolean | number;
  alerta_divergencia_os: boolean | number;
  alertas?: string[] | string | null;
  quantidade_alertas: number;
};
const money = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api/grandes-projetos/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const t = await r.text();
  let d: any = {};
  try {
    d = t ? JSON.parse(t) : {};
  } catch {
    d = { message: t };
  }
  if (!r.ok) throw new Error(d.message || "Falha na operação");
  return d;
}
function tone(
  s?: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (s === "Concluído") return "success";
  if (s === "Em execução") return "info";
  if (s === "Paralisado") return "warning";
  if (s === "Cancelado") return "danger";
  return "neutral";
}
export function GpDashboard() {
  const [legacy, setLegacy] = useState<Dashboard | null>(null);
  const [summary, setSummary] = useState<ExecutiveSummaryV2 | null>(null);
  const [projects, setProjects] = useState<ExecutivePanelV2[]>([]);
  const [legacyError, setLegacyError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [projectsError, setProjectsError] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLegacyError("");
    setSummaryError("");
    setProjectsError("");
    setLoadingSummary(true);
    setLoadingProjects(true);

    const [legacyResult, summaryResult, projectsResult] =
      await Promise.allSettled([
        api<Dashboard>("dashboard"),
        api<ExecutiveSummaryV2 | null>("painel-resumo-v2"),
        api<ExecutivePanelV2[]>("painel-executivo-v2"),
      ]);

    if (legacyResult.status === "fulfilled") {
      setLegacy(legacyResult.value);
    } else {
      setLegacyError(
        legacyResult.reason instanceof Error
          ? legacyResult.reason.message
          : "Falha ao carregar o dashboard anterior.",
      );
    }

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      setSummaryError(
        summaryResult.reason instanceof Error
          ? summaryResult.reason.message
          : "Falha ao carregar o resumo executivo.",
      );
    }

    if (projectsResult.status === "fulfilled") {
      setProjects(
        Array.isArray(projectsResult.value)
          ? projectsResult.value
          : [],
      );
    } else {
      setProjectsError(
        projectsResult.reason instanceof Error
          ? projectsResult.reason.message
          : "Falha ao carregar o painel executivo.",
      );
    }

    setLoadingSummary(false);
    setLoadingProjects(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const totalProjects =
    summary?.total_projetos ??
    legacy?.projetos;

  const runningProjects =
    summary?.projetos_em_execucao ??
    legacy?.emExecucao;

  const totalContracts =
    summary?.valor_total_contratos ??
    legacy?.carteira;

  const budgetBalance =
    summary?.saldo_total_orcamento;

  const alerts = projects.reduce(
    (total, project) =>
      total + Number(project.quantidade_alertas || 0),
    0,
  );

  return (
    <>
      <PageHeader
        section="Grandes Projetos"
        title="Painel Executivo"
        description="Visão executiva de contratos, orçamento, progresso, materiais, ordens de serviço, prazos e alertas."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void loadDashboard()}
              disabled={loadingSummary || loadingProjects}
            >
              {loadingSummary || loadingProjects
                ? "Atualizando..."
                : "Atualizar"}
            </Button>
            <Link href="/grandes-projetos/projetos">
              <Button>Ver projetos</Button>
            </Link>
          </>
        }
      />

      {legacyError && !summary && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          Dashboard anterior indisponível: {legacyError}
        </p>
      )}

      {summaryError && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          Resumo executivo indisponível: {summaryError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          [
            "Projetos",
            totalProjects,
            "Total da carteira",
          ],
          [
            "Em execução",
            runningProjects,
            "Projetos ativos",
          ],
          [
            "Contratos",
            totalContracts == null
              ? null
              : money(totalContracts),
            "Valor total",
          ],
          [
            "Saldo orçamentário",
            budgetBalance == null
              ? null
              : money(budgetBalance),
            "Orçado menos realizado",
          ],
          [
            "Projetos atrasados",
            summary?.projetos_atrasados,
            "Prazo vencido",
          ],
          [
            "Alertas",
            loadingProjects ? null : alerts,
            "Ocorrências no painel",
          ],
        ].map(([label, value, description]) => (
          <Card key={String(label)}>
            <CardBody>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-bold">
                {value ?? "..."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {description}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      {summary && (
        <>
          <Card className="mt-5">
            <CardHeader>
              <div>
                <h2 className="font-bold">
                  Atenções executivas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pendências estruturais, financeiras e operacionais.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["Vencendo hoje", summary.projetos_vencendo_hoje],
                  [
                    "Vencendo em 30 dias",
                    summary.projetos_vencendo_30_dias,
                  ],
                  ["Sem gerente", summary.projetos_sem_gerente],
                  ["Sem marcos", summary.projetos_sem_marcos],
                  ["Sem materiais", summary.projetos_sem_materiais],
                  [
                    "Realizado sem orçamento",
                    summary.projetos_realizado_sem_orcamento,
                  ],
                  [
                    "Divergência de OS",
                    summary.projetos_com_divergencia_os,
                  ],
                  ["OS abertas", summary.total_os_abertas],
                  [
                    "OS encerradas sem data",
                    summary.total_os_encerradas_sem_data,
                  ],
                  [
                    "Relatórios em rascunho",
                    summary.total_relatorios_rascunho,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {label}
                    </p>
                    <p
                      className={`mt-2 text-2xl font-bold ${
                        Number(value || 0) > 0
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {Number(value || 0).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="mt-5">
            <CardHeader>
              <div>
                <h2 className="font-bold">
                  Consolidação financeira e operacional
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Valores e volumes consolidados dos Grandes Projetos.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "Valor orçado",
                    money(summary.valor_total_orcado),
                  ],
                  [
                    "Valor realizado",
                    money(summary.valor_total_realizado),
                  ],
                  [
                    "Saldo orçamentário",
                    money(summary.saldo_total_orcamento),
                  ],
                  [
                    "Total de OS",
                    summary.total_os.toLocaleString("pt-BR"),
                  ],
                  [
                    "OS encerradas",
                    summary.total_os_encerradas.toLocaleString(
                      "pt-BR",
                    ),
                  ],
                  [
                    "OS abertas",
                    summary.total_os_abertas.toLocaleString(
                      "pt-BR",
                    ),
                  ],
                  [
                    "Relatórios",
                    summary.total_relatorios.toLocaleString(
                      "pt-BR",
                    ),
                  ],
                  [
                    "Rascunhos",
                    summary.total_relatorios_rascunho.toLocaleString(
                      "pt-BR",
                    ),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"
                  >
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <Card className="mt-5">
        <CardHeader>
          <div>
            <h2 className="font-bold">
              Projetos por criticidade
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ordenação fornecida pelo serviço executivo, priorizando projetos com mais alertas.
            </p>
          </div>
        </CardHeader>

        {projectsError && (
          <CardBody>
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              Painel executivo indisponível: {projectsError}
            </p>
          </CardBody>
        )}

        {!projectsError && loadingProjects && (
          <CardBody>
            <p className="text-sm text-slate-500">
              Carregando painel executivo...
            </p>
          </CardBody>
        )}

        {!projectsError &&
          !loadingProjects &&
          projects.length === 0 && (
            <EmptyState
              title="Nenhum projeto disponível"
              description="O endpoint executivo não retornou projetos."
            />
          )}

        {!projectsError &&
          !loadingProjects &&
          projects.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3">Projeto</th>
                    <th className="px-4 py-3">Responsável</th>
                    <th className="px-4 py-3">Financeiro</th>
                    <th className="px-4 py-3">Progresso</th>
                    <th className="px-4 py-3">Materiais</th>
                    <th className="px-4 py-3">OS</th>
                    <th className="px-4 py-3">Prazo</th>
                    <th className="px-4 py-3 text-right">
                      Alertas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {projects.map((project) => (
                    <tr key={project.projeto_id}>
                      <td className="min-w-72 px-4 py-4">
                        <Link
                          href={`/grandes-projetos/projetos/${project.projeto_id}`}>
                          {project.nome}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {[
                            project.codigo,
                            project.cliente,
                            project.uf,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Sem identificação adicional"}
                        </p>
                        <p className="mt-2 text-xs">
                          Contrato: {money(project.valor_contrato)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p>{project.gerente || "Não informado"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {project.status || "Sem status"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <ExecutiveBadge
                          value={project.indicador_financeiro}
                        />
                        <p className="mt-2 whitespace-nowrap text-xs text-slate-500">
                          Realizado: {money(project.valor_realizado)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Orçado: {money(project.valor_orcado)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <ExecutiveBadge
                          value={project.indicador_progresso}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {Number(
                            project.progresso_medio || 0,
                          ).toLocaleString("pt-BR", {
                            maximumFractionDigits: 1,
                          })}
                          %
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <ExecutiveBadge
                          value={project.indicador_material}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {Number(
                            project.percentual_material_entregue || 0,
                          ).toLocaleString("pt-BR", {
                            maximumFractionDigits: 1,
                          })}
                          % entregue
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <ExecutiveBadge
                          value={project.indicador_os}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {project.os_encerradas || 0} encerradas
                        </p>
                        <p className="text-xs text-slate-500">
                          {project.os_abertas || 0} abertas
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <ExecutiveBadge
                          value={project.indicador_prazo}
                        />
                        <p className="mt-2 whitespace-nowrap text-xs text-slate-500">
                          {formatExecutiveDate(
                            project.data_fim_prev,
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex min-w-10 justify-center rounded-full px-3 py-1 font-bold ${
                            Number(project.quantidade_alertas || 0) >
                            0
                              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          }`}
                        >
                          {Number(
                            project.quantidade_alertas || 0,
                          )}
                        </span>
                        <ExecutiveAlerts
                          alerts={project.alertas}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {legacy && Object.keys(legacy.porStatus || {}).length > 0 && (
        <Card className="mt-5">
          <CardHeader>
            <div>
              <h2 className="font-bold">
                Distribuição por status
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Indicador preservado do dashboard anterior.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(legacy.porStatus).map(
                ([status, total]) => (
                  <div
                    key={status}
                    className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"
                  >
                    <Badge tone={tone(status)}>
                      {status}
                    </Badge>
                    <p className="mt-3 text-2xl font-bold">
                      {total}
                    </p>
                  </div>
                ),
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function ExecutiveBadge({
  value,
}: {
  value?: ExecutiveIndicator | null;
}) {
  const normalized = String(value || "CINZA").toUpperCase();

  const style =
    normalized === "VERDE"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : normalized === "AMARELO"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        : normalized === "VERMELHO"
          ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {value || "Não disponível"}
    </span>
  );
}

function ExecutiveAlerts({
  alerts,
}: {
  alerts?: string[] | string | null;
}) {
  const items = Array.isArray(alerts)
    ? alerts
    : typeof alerts === "string"
      ? alerts
          .split(/[;,|]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  if (items.length === 0) return null;

  return (
    <details className="mt-2 text-left">
      <summary className="cursor-pointer text-xs font-semibold text-red-600">
        Ver alertas
      </summary>
      <ul className="mt-2 min-w-56 list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

function formatExecutiveDate(value?: string | null) {
  if (!value) return "Sem previsão";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR");
}

export function GpProjects({
  canManage: _canManage,
  canDelete: _canDelete,
}: {
  canManage: boolean;
  canDelete: boolean;
}) {
  void _canManage;
  void _canDelete;

  const [data, setData] = useState<{
      itens: Project[];
      paginacao: { total: number };
    } | null>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<any>(
        `?busca=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
      )
        .then(setData)
        .catch((x) => setError(x.message)),
    [search, status],
  );
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  return (
    <>
      <PageHeader
        section="Grandes Projetos"
        title="Projetos"
        description="Carteira, escopo, contrato e desempenho financeiro."
      />
      <Card>
        <CardBody className="grid gap-3 md:grid-cols-[1fr_240px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por projeto, cliente, contrato ou pedido"
          />
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {[
              "Planejamento",
              "Em execução",
              "Concluído",
              "Paralisado",
              "Cancelado",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </CardBody>
      </Card>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {data?.itens.map((p) => (
          <Link href={`/grandes-projetos/projetos/${p.id}`} key={p.id}>
            <Card className="h-full transition hover:border-red-300">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {p.numero_contrato ||
                        p.numero_pedido ||
                        `Projeto ${p.id}`}
                    </p>
                    <h2 className="mt-1 text-lg font-bold">{p.nome}</h2>
                    <p className="text-sm text-slate-500">
                      {p.cliente || "Cliente não informado"}
                      {p.uf ? ` · ${p.uf}` : ""}
                    </p>
                  </div>
                  <Badge tone={tone(p.status)}>
                    {p.status || "Sem status"}
                  </Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Contrato</span>
                    <b className="block">{money(p.financeiro.contrato)}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">Lucro líquido</span>
                    <b className="block">{money(p.financeiro.lucroLiquido)}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">Margem</span>
                    <b className="block">
                      {p.financeiro.margemLiquida.toFixed(1)}%
                    </b>
                  </div>
                  <div>
                    <span className="text-slate-500">OS / Materiais</span>
                    <b className="block">
                      {p._count?.gp_os || 0} / {p._count?.gp_material || 0}
                    </b>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
      {data && !data.itens.length && (
        <Card className="mt-5">
          <EmptyState title="Nenhum projeto encontrado" />
        </Card>
      )}
    </>
  );
}
type Detail = Project & {
  gp_custo: any[];
  gp_material: any[];
  gp_os: any[];
  gp_marco: any[];
  gp_relatorio: any[];
};

type OrderSyncResult = {
  projetoId: number;
  proposta: string | null;
  contrato: string | null;
  localizadas: number;
  existentes: number;
  incluidas: number;
  ignoradas: number;
  ambiguidades: number;
  sincronizadoEm: string;
  motivo?: string;
};
export function GpDetail({
  id,
  canManage: _canManage,
  canDelete: _canDelete,
  canRestore: _canRestore,
  canManageOs,
  canApprove,
}: {
  id: number;
  canManage: boolean;
  canDelete: boolean;
  canRestore: boolean;
  canManageOs: boolean;
  canApprove: boolean;
}) {
  void _canManage;
  void _canDelete;
  void _canRestore;

  const [p, setP] = useState<Detail | null>(null),
    [tab, setTab] = useState("resumo"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [syncWarning, setSyncWarning] = useState(""),
    [syncResult, setSyncResult] = useState<OrderSyncResult | null>(null),
    [approvalAction, setApprovalAction] = useState<"submeter" | "aprovar" | "rejeitar" | "">(""),
    [rejectionReason, setRejectionReason] = useState("");

  const autoSyncProjectRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);

  const load = useCallback(async (): Promise<Detail | null> => {
    try {
      const detail = await api<Detail>(String(id));
      setP(detail);
      return detail;
    } catch (x) {
      setError(
        x instanceof Error
          ? x.message
          : "Falha ao carregar o projeto.",
      );
      return null;
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const loadAndSync = async () => {
      const detail = await load();

      if (
        cancelled ||
        !detail ||
        !canManageOs ||
        !detail.numero_contrato ||
        autoSyncProjectRef.current === id ||
        syncInFlightRef.current
      ) {
        return;
      }

      autoSyncProjectRef.current = id;
      syncInFlightRef.current = true;
      setSyncWarning("");

      try {
        const result = await api<OrderSyncResult>(
          `${id}/os/sincronizar`,
          {
            method: "POST",
          },
        );

        if (cancelled) return;

        setSyncResult(result);
        await load();
      } catch (x) {
        if (!cancelled) {
          setSyncWarning(
            x instanceof Error
              ? x.message
              : "O projeto foi carregado, mas não foi possível sincronizar as OS.",
          );
        }
      } finally {
        syncInFlightRef.current = false;

      }
    };

    void loadAndSync();

    return () => {
      cancelled = true;
    };
  }, [canManageOs, id, load]);
  async function transitionApproval(action: "submeter" | "aprovar" | "rejeitar") {
    if (action === "rejeitar" && !rejectionReason.trim()) {
      setError("Informe o motivo da rejeição.");
      return;
    }
    if (action === "aprovar" && !window.confirm("Confirma a aprovação deste projeto?")) return;
    if (action === "submeter" && !window.confirm("Confirma o envio deste projeto para aprovação?")) return;
    setApprovalAction(action);
    setError("");
    setMessage("");
    try {
      await api(`${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({
          versao: p?.versao,
          ...(action === "rejeitar" ? { motivo: rejectionReason.trim() } : {}),
        }),
      });
      setRejectionReason("");
      setMessage(
        action === "submeter" ? "Projeto enviado para aprovação." :
        action === "aprovar" ? "Projeto aprovado com sucesso." :
        "Projeto rejeitado com sucesso.",
      );
      await load();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Falha na transição de aprovação.");
      await load();
    } finally {
      setApprovalAction("");
    }
  }

  if (error && !p) return <p className="text-red-600">{error}</p>;
  if (!p) return <p>Carregando...</p>;
  const tabs = [
    ["resumo", "Resumo"],
    ["custos", `Custos (${p.gp_custo.length})`],
    ["materiais", `Materiais (${p.gp_material.length})`],
    ["os", `OS (${p.gp_os.length})`],
    ["marcos", `Marcos (${p.gp_marco.length})`],
    ["relatorios", `Relatórios (${p.gp_relatorio.length})`],
  ];
  return (
    <>
      <PageHeader
        section="Grandes Projetos"
        title={p.nome}
        description={`${p.cliente || "Cliente não informado"}${p.numero_contrato ? ` · Contrato ${p.numero_contrato}` : ""}`}
        actions={
          <>
            <Badge tone={tone(p.status)}>{p.status || "Sem status"}</Badge>
            <Badge tone={p.aprovacao_status === "APROVADO" ? "success" : p.aprovacao_status === "PENDENTE" ? "warning" : p.aprovacao_status === "REJEITADO" ? "danger" : "neutral"}>
              {p.aprovacao_status === "NAO_SUBMETIDO" ? "Não submetido" : p.aprovacao_status === "PENDENTE" ? "Pendente de aprovação" : p.aprovacao_status === "APROVADO" ? "Aprovado" : p.aprovacao_status === "REJEITADO" ? "Rejeitado" : "Não submetido"}
            </Badge>
            {_canManage && ["NAO_SUBMETIDO", "REJEITADO", undefined].includes(p.aprovacao_status) && (
              <Button disabled={Boolean(approvalAction)} onClick={() => void transitionApproval("submeter")}>
                {approvalAction === "submeter" ? "Enviando..." : "Submeter para aprovação"}
              </Button>
            )}
            {canApprove && p.aprovacao_status === "PENDENTE" && (
              <>
                <Button disabled={Boolean(approvalAction)} onClick={() => void transitionApproval("aprovar")}>
                  {approvalAction === "aprovar" ? "Aprovando..." : "Aprovar"}
                </Button>
                <Button variant="secondary" disabled={Boolean(approvalAction)} onClick={() => (document.getElementById("gp-reject-dialog") as HTMLDialogElement | null)?.showModal()}>Rejeitar</Button>
              </>
            )}
          </>
        }
      />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {syncWarning && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          O projeto foi carregado, mas a sincronização automática das OS
          não foi concluída: {syncWarning}
        </p>
      )}
      {syncResult && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
        >
          OS sincronizadas: {syncResult.incluidas} novas,{" "}
          {syncResult.existentes} existentes e{" "}
          {syncResult.ambiguidades} ambiguidades. Atualizado em{" "}
          {new Date(syncResult.sincronizadoEm).toLocaleString("pt-BR")}.
        </p>
      )}
      {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
      {p.aprovacao_status === "APROVADO" && p.aprovado_em && (
        <p className="mb-4 text-sm text-slate-500">Aprovado em {new Date(p.aprovado_em).toLocaleString("pt-BR")}.</p>
      )}
      <dialog id="gp-reject-dialog" className="m-auto w-[min(560px,calc(100%-2rem))] rounded-2xl bg-white p-6 shadow-2xl backdrop:bg-black/60 dark:bg-slate-950">
        <h2 className="text-xl font-bold">Rejeitar projeto</h2>
        <p className="mt-2 text-sm text-slate-500">Informe o motivo. Ele será registrado na auditoria.</p>
        <label className="mt-4 block text-sm font-semibold">Motivo da rejeição
          <textarea value={rejectionReason} maxLength={500} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700" />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={Boolean(approvalAction)} onClick={() => (document.getElementById("gp-reject-dialog") as HTMLDialogElement | null)?.close()}>Cancelar</Button>
          <Button disabled={Boolean(approvalAction) || !rejectionReason.trim()} onClick={async () => { await transitionApproval("rejeitar"); (document.getElementById("gp-reject-dialog") as HTMLDialogElement | null)?.close(); }}>
            {approvalAction === "rejeitar" ? "Rejeitando..." : "Confirmar rejeição"}
          </Button>
        </div>
      </dialog>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <Button
            key={k}
            variant={tab === k ? "primary" : "secondary"}
            onClick={() => setTab(k)}
          >
            {l}
          </Button>
        ))}
      </div>
      {tab === "resumo" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Contrato", money(p.financeiro.contrato)],
            ["Orçado", money(p.financeiro.orcado)],
            ["Realizado", money(p.financeiro.realizado)],
            ["Lucro líquido", money(p.financeiro.lucroLiquido)],
            ["Margem", `${p.financeiro.margemLiquida.toFixed(1)}%`],
            [
              "Execução orçamento",
              `${p.financeiro.execucaoOrcamento.toFixed(1)}%`,
            ],
            ["Impostos", money(p.financeiro.impostos)],
            ["Desvio", money(p.financeiro.desvio)],
          ].map(([l, v]) => (
            <Card key={l}>
              <CardBody>
                <p className="text-xs uppercase text-slate-500">{l}</p>
                <p className="mt-2 text-xl font-bold">{v}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      {tab !== "resumo" && (
        <Collection
          title={tabs.find((x) => x[0] === tab)?.[1] || tab}
          rows={
            (p as any)[
              `gp_${tab === "custos" ? "custo" : tab === "materiais" ? "material" : tab}`
            ] || []
          }
        />
      )}
    </>
  );
}
function Collection({ title, rows }: { title: string; rows: any[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-bold">{title}</h2>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <tbody className="divide-y dark:divide-slate-800">
            {rows.map((r, i) => (
              <tr key={r.id || i}>
                <td className="p-4 font-semibold">
                  {r.descricao ||
                    r.produto ||
                    r.numero_os ||
                    r.titulo ||
                    r.tipo}
                </td>
                <td className="p-4 text-slate-500">
                  {r.categoria || r.situacao || r.status || r.responsavel || ""}
                </td>
                <td className="p-4 text-right">
                  {r.valor_realizado != null
                    ? money(r.valor_realizado)
                    : r.valor != null
                      ? money(r.valor)
                      : r.percentual != null
                        ? `${r.percentual}%`
                        : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState title="Nenhum registro" />}
      </div>
    </Card>
  );
}
export function GpReports() {
  return (
    <>
      <PageHeader
        section="Grandes Projetos"
        title="Relatórios"
        description="Os relatórios de início e fim são administrados dentro do dossiê de cada projeto."
      />
      <Card>
        <EmptyState
          title="Selecione um projeto"
          description="Abra Projetos e escolha o dossiê para consultar ou administrar relatórios."
        />
        <CardBody className="pt-0 text-center">
          <Link href="/grandes-projetos/projetos">
            <Button>Ir para projetos</Button>
          </Link>
        </CardBody>
      </Card>
    </>
  );
}
