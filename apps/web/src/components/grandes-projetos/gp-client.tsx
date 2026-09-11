/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  const [d, setD] = useState<Dashboard | null>(null),
    [e, setE] = useState("");
  useEffect(() => {
    api<Dashboard>("dashboard")
      .then(setD)
      .catch((x) => setE(x.message));
  }, []);
  return (
    <>
      <PageHeader
        section="Grandes Projetos"
        title="Dashboard"
        description="Visão consolidada da carteira e resultado financeiro."
        actions={
          <Link href="/grandes-projetos/projetos">
            <Button>Ver projetos</Button>
          </Link>
        }
      />
      {e && <p className="mb-4 text-red-600">{e}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Projetos", d?.projetos],
          ["Em execução", d?.emExecucao],
          ["Carteira", d ? money(d.carteira) : null],
          ["Lucro líquido", d ? money(d.lucroLiquido) : null],
        ].map(([l, v]) => (
          <Card key={String(l)}>
            <CardBody>
              <p className="text-xs font-semibold uppercase text-slate-500">
                {l}
              </p>
              <p className="mt-2 text-2xl font-bold">{v ?? "..."}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <CardHeader>
          <h2 className="font-bold">Projetos por status</h2>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(d?.porStatus || {}).map(([s, n]) => (
              <div
                key={s}
                className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"
              >
                <Badge tone={tone(s)}>{s}</Badge>
                <p className="mt-3 text-2xl font-bold">{n}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
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
    [approvalAction, setApprovalAction] = useState<"submeter" | "aprovar" | "rejeitar" | "">(""),
    [rejectionReason, setRejectionReason] = useState("");
  const load = useCallback(
    () =>
      api<Detail>(String(id))
        .then(setP)
        .catch((x) => setError(x.message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);
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

  async function importOs() {
    try {
      await api(`${id}/os/importar-contrato`, { method: "POST" });
      await load();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Falha");
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
            {p.numero_contrato && canManageOs && (
              <Button variant="secondary" onClick={importOs}>
                Importar OS do contrato
              </Button>
            )}
          </>
        }
      />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
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
