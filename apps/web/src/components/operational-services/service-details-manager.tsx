"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RecordValue = Record<string, unknown>;
type EmailAction = "abertura" | "conclusao";

type Details = {
  resumo: RecordValue & {
    id: string;
    proposta?: string | null;
    cliente: string;
    titulo?: string | null;
    contrato?: string | null;
    pedido?: string | null;
    enderecoInstalacao?: string | null;
    contatoNome?: string | null;
    contatoEmail?: string | null;
    contatoTelefone?: string | null;
    ativo: boolean;
    atrasado: boolean;
  };
  planejamento: {
    diasPreparacao: number;
    tempoExecucaoDias?: number | null;
    dataAprovacao?: string | null;
    inicioPlanejado?: string | null;
    prazoFinal?: string | null;
    inicioReal?: string | null;
    conclusaoReal?: string | null;
    status: string;
    percentual: number | string;
    atrasado: boolean;
  };
  responsaveis: Array<{
    pessoaId: string;
    papel?: string | null;
    ativo: boolean;
    pessoa: {
      nome: string;
      email?: string | null;
      telefone?: string | null;
      cargo?: string | null;
    };
  }>;
  diario: RecordValue[];
  visitasTecnicas: RecordValue[];
  materiais: {
    quantidadePedidos: number;
    quantidadeItens: number;
    pedidos: Array<{
      numero: string;
      dataPedido?: string | null;
      situacao?: string | null;
      enderecoEntrega?: string | null;
      itens: RecordValue[];
    }>;
  };
  ordensServico: Array<RecordValue & { equipamentos?: RecordValue[] }>;
  anexos: RecordValue[];
  emails: RecordValue[];
  historico: RecordValue[];
  auditoria: RecordValue[];
  contadores: Record<string, number>;
};

const tabs = [
  "resumo",
  "diario",
  "visitas",
  "materiais",
  "os",
  "arquivos",
  "emails",
  "historico",
] as const;

type Tab = (typeof tabs)[number];

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function date(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? text(value)
    : parsed.toLocaleDateString("pt-BR");
}

function situacaoInfo(
  status: unknown,
  atrasado: boolean,
): {
  label: string;
  cls: string;
} {
  const st = String(status ?? "")
    .trim()
    .toLowerCase();
  const concl = ["concluído", "concluido", "concluída", "concluida"].includes(
    st,
  );
  const canc = ["cancelado", "cancelada"].includes(st);

  if (canc)
    return {
      label: "Cancelado",
      cls: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    };
  if (concl)
    return {
      label: "Concluído",
      cls: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    };
  if (atrasado)
    return {
      label: "Atrasado",
      cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    };
  if (st === "aguardando cliente")
    return {
      label: "Aguardando cliente",
      cls: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    };
  if (st === "falta material")
    return {
      label: "Falta material",
      cls: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    };
  if (st === "em andamento")
    return {
      label: "Em andamento",
      cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    };
  if (["planejado", "não iniciado", "nao iniciado"].includes(st))
    return {
      label: "Planejamento",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    };

  return {
    label: String(status ?? "—"),
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
}

function percent(value: unknown) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

export function ServiceDetailsManager({
  serviceId,
  canManage,
}: {
  serviceId: string;
  canManage: boolean;
}) {
  const [data, setData] = useState<Details | null>(null);
  const [tab, setTab] = useState<Tab>("resumo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailAction, setEmailAction] = useState<EmailAction | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch(
      `/api/operacional/servicos/${serviceId}/detalhes`,
      { cache: "no-store" },
    );

    const body = await response.json();

    if (!response.ok) {
      const message = Array.isArray(body.message)
        ? body.message.join(". ")
        : body.message;

      setError(message || "Não foi possível carregar o serviço.");
      setLoading(false);
      return;
    }

    setData(body);
    setLoading(false);
  }, [serviceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function sendEmail() {
    if (!emailAction) return;
    setSendingEmail(true);
    setEmailFeedback("");
    try {
      const response = await fetch(
        `/api/operacional/servicos/${serviceId}/emails/${emailAction}`,
        { method: "POST" },
      );
      const body = (await response.json().catch(() => ({}))) as {
        message?: string | string[];
        destinatarios?: number;
      };
      if (!response.ok) {
        const message = Array.isArray(body.message)
          ? body.message.join(". ")
          : body.message;
        throw new Error(message ?? "Nao foi possivel enviar o e-mail.");
      }
      setEmailFeedback(
        `E-mail enviado com sucesso para ${body.destinatarios ?? 0} destinatario(s).`,
      );
      setEmailAction(null);
      await load();
      setTab("emails");
    } catch (reason) {
      setEmailFeedback(
        reason instanceof Error ? reason.message : "Falha no envio do e-mail.",
      );
    } finally {
      setSendingEmail(false);
    }
  }

  if (loading) {
    return <p className="p-8 text-center">Carregando serviço...</p>;
  }

  if (error || !data) {
    return (
      <section className="space-y-4">
        <Link
          href="/operacional/servicos"
          className="text-sm font-semibold text-red-600"
        >
          ← Voltar para Serviços
        </Link>
        <p className="rounded-2xl bg-red-50 p-5 text-red-700">
          {error || "Serviço não encontrado."}
        </p>
      </section>
    );
  }

  const { resumo, planejamento, contadores } = data;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
          <Link
            href="/operacional/servicos"
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            ← Gestão de serviços
          </Link>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-600">
                Proposta {text(resumo.proposta)}
              </p>
              <h1 className="mt-1 text-3xl font-bold">
                {text(resumo.titulo || resumo.cliente)}
              </h1>
              <p className="mt-1 text-slate-500">{resumo.cliente}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const si = situacaoInfo(
                  planejamento.status,
                  planejamento.atrasado,
                );
                return (
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${si.cls}`}
                  >
                    {si.label}
                  </span>
                );
              })()}
              {!resumo.ativo && (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  Inativo
                </span>
              )}
              {resumo.propostaPdf ? (
                <a
                  href={`/api/operacional/servicos/${resumo.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                >
                  PDF da proposta
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Progresso</span>
              <span>{percent(planejamento.percentual)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-red-600 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, Number(planejamento.percentual || 0) * 100),
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <HeroFact label="Responsável" value={resumo.responsavel} />
          <HeroFact label="Prioridade" value={resumo.prioridade} />
          <HeroFact
            label="Aprovação"
            value={date(planejamento.dataAprovacao)}
          />
          <HeroFact
            label="Início planejado"
            value={date(planejamento.inicioPlanejado)}
          />
          <HeroFact label="Prazo final" value={date(planejamento.prazoFinal)} />
          <HeroFact
            label="Conclusão real"
            value={date(planejamento.conclusaoReal)}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Progresso" value={percent(planejamento.percentual)} />
        <Metric label="Responsáveis" value={contadores.responsaveis ?? 0} />
        <Metric label="Visitas" value={contadores.visitasTecnicas ?? 0} />
        <Metric label="Pedidos" value={contadores.pedidos ?? 0} />
        <Metric
          label="Ordens de serviço"
          value={contadores.ordensServico ?? 0}
        />
        <Metric label="Anexos" value={contadores.anexos ?? 0} />
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold capitalize ${
              tab === item
                ? "bg-red-600 text-white"
                : "hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            {item}
            {(() => {
              const counts: Record<string, number | undefined> = {
                diario: contadores.andamentos,
                visitas: contadores.visitasTecnicas,
                materiais: contadores.pedidos,
                os: contadores.ordensServico,
                arquivos: contadores.anexos,
                emails: contadores.emails,
                historico: contadores.alteracoes,
              };
              const n = counts[item];
              return typeof n === "number" && n > 0 ? (
                <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
                  {n}
                </span>
              ) : null;
            })()}
          </button>
        ))}
      </nav>

      {tab === "resumo" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Dados do serviço">
            <Info label="Cliente" value={resumo.cliente} />
            <Info label="Contrato" value={resumo.contrato} />
            <Info label="Pedido principal" value={resumo.pedido} />
            <Info label="Endereço" value={resumo.enderecoInstalacao} />
            <Info label="Contato" value={resumo.contatoNome} />
            <Info label="E-mail" value={resumo.contatoEmail} />
            <Info label="Telefone" value={resumo.contatoTelefone} />
          </Panel>

          <Panel title="Planejamento">
            <Info label="Aprovação" value={date(planejamento.dataAprovacao)} />
            <Info
              label="Preparação"
              value={`${planejamento.diasPreparacao} dias úteis`}
            />
            <Info
              label="Início planejado"
              value={date(planejamento.inicioPlanejado)}
            />
            <Info
              label="Execução"
              value={
                planejamento.tempoExecucaoDias === null ||
                planejamento.tempoExecucaoDias === undefined
                  ? "Não definida"
                  : `${planejamento.tempoExecucaoDias} dias úteis`
              }
            />
            <Info label="Prazo final" value={date(planejamento.prazoFinal)} />
            <Info label="Início real" value={date(planejamento.inicioReal)} />
            <Info
              label="Conclusão real"
              value={date(planejamento.conclusaoReal)}
            />
          </Panel>

          <Panel title="Responsáveis">
            <Cards
              rows={data.responsaveis}
              render={(item) => (
                <>
                  <strong>{item.pessoa.nome}</strong>
                  <p>{text(item.papel || item.pessoa.cargo)}</p>
                  <p>{text(item.pessoa.email)}</p>
                </>
              )}
            />
          </Panel>

          <Panel title="Indicadores">
            {Object.entries(contadores).map(([key, value]) => (
              <Info key={key} label={key} value={value} />
            ))}
          </Panel>
        </div>
      )}

      {tab === "diario" && (
        <Panel title="Diário do serviço">
          <Cards
            rows={data.diario}
            render={(item) => (
              <>
                <strong>{date(item.registradoEm)}</strong>
                <p>{text(item.descricao)}</p>
                <small>
                  {text(item.usuario)} · {text(item.statusNoMomento)} ·{" "}
                  {percent(item.percentual)}
                </small>
              </>
            )}
          />
        </Panel>
      )}

      {tab === "visitas" && (
        <Panel title="Visitas técnicas">
          <DataTable
            rows={data.visitasTecnicas}
            columns={[
              ["dataVisita", "Data"],
              ["dataFim", "Fim"],
              ["tecnico", "Técnico"],
              ["turno", "Turno"],
              ["status", "Status"],
              ["observacoes", "Observações"],
            ]}
          />
        </Panel>
      )}

      {tab === "materiais" && (
        <div className="space-y-5">
          {data.materiais.pedidos.map((pedido) => (
            <Panel key={pedido.numero} title={`Pedido ${pedido.numero}`}>
              <p className="mb-4 text-sm text-slate-500">
                {date(pedido.dataPedido)} · {text(pedido.situacao)}
              </p>
              <DataTable
                rows={pedido.itens}
                columns={[
                  ["produto", "Produto"],
                  ["descricao", "Descrição"],
                  ["grupo", "Grupo"],
                  ["quantidade", "Quantidade"],
                  ["status", "Status"],
                ]}
              />
            </Panel>
          ))}
          {!data.materiais.pedidos.length && <Empty />}
        </div>
      )}

      {tab === "os" && (
        <Panel title="Ordens de serviço">
          <DataTable
            rows={data.ordensServico}
            columns={[
              ["numero", "OS"],
              ["abertura", "Abertura"],
              ["fechamento", "Fechamento"],
              ["tipo", "Tipo"],
              ["situacao", "Situação"],
              ["tecnico", "Técnico"],
              ["solicitacao", "Solicitação"],
              ["laudo", "Laudo"],
              ["conclusao", "Conclusão"],
            ]}
          />
        </Panel>
      )}

      {tab === "arquivos" && (
        <Panel title="Arquivos anexados">
          <DataTable
            rows={data.anexos}
            columns={[
              ["nomeOriginal", "Arquivo"],
              ["tipo", "Tipo"],
              ["mimeType", "Formato"],
              ["tamanho", "Tamanho"],
              ["criadoPor", "Incluído por"],
              ["criadoEm", "Data"],
            ]}
          />
        </Panel>
      )}

      {tab === "emails" && (
        <Panel title="Histórico de e-mails">
          {canManage && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="font-semibold">Acoes administrativas</p>
              <p className="mt-1 text-sm text-slate-500">
                O envio usa os destinatarios internos configurados e registra uma nova tentativa no historico.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setEmailFeedback(""); setEmailAction("abertura"); }}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                >
                  Reenviar abertura
                </button>
                <button
                  type="button"
                  onClick={() => { setEmailFeedback(""); setEmailAction("conclusao"); }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  {data.emails.some((item) => item.tipo === "conclusao")
                    ? "Reenviar finalizacao"
                    : "Enviar finalizacao"}
                </button>
              </div>
            </div>
          )}
          {emailFeedback && (
            <p role="status" className="mb-4 rounded-xl border bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              {emailFeedback}
            </p>
          )}
          <DataTable
            rows={data.emails}
            columns={[
              ["enviadoEm", "Data"],
              ["tipo", "Tipo"],
              ["assunto", "Assunto"],
              ["destinatarios", "Destinatários"],
              ["sucesso", "Sucesso"],
              ["tentativa", "Tentativa"],
              ["detalhe", "Detalhe"],
            ]}
          />
        </Panel>
      )}

      {emailAction && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="email-confirm-title"
            aria-describedby="email-confirm-description"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-950"
          >
            <h2 id="email-confirm-title" className="text-xl font-bold">
              Confirmar envio
            </h2>
            <p id="email-confirm-description" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {emailAction === "abertura"
                ? "Reenviar o informativo interno de abertura deste servico?"
                : "Enviar o informativo interno de finalizacao deste servico?"}
            </p>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Proposta {text(resumo.proposta)} | {resumo.cliente} | Contrato {text(resumo.contrato)}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={sendingEmail}
                onClick={() => setEmailAction(null)}
                className="rounded-xl border px-4 py-2 disabled:opacity-50 dark:border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sendingEmail}
                onClick={() => void sendEmail()}
                className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
              >
                {sendingEmail ? "Enviando..." : "Confirmar envio"}
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === "historico" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Histórico operacional">
            <DataTable
              rows={data.historico}
              columns={[
                ["registradoEm", "Data"],
                ["usuario", "Usuário"],
                ["campo", "Campo"],
                ["valorAntigo", "Anterior"],
                ["valorNovo", "Novo"],
              ]}
            />
          </Panel>

          <Panel title="Auditoria">
            <DataTable
              rows={data.auditoria}
              columns={[
                ["criadoEm", "Data"],
                ["entidade", "Entidade"],
                ["acao", "Ação"],
              ]}
            />
          </Panel>
        </div>
      )}
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function HeroFact({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold">{text(value)}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <article className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{text(value)}</p>
    </article>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between gap-4 border-t py-3 text-sm dark:border-slate-800">
      <span className="text-slate-500">{label}</span>
      <strong className="text-right">{text(value)}</strong>
    </div>
  );
}

function Cards<T>({
  rows,
  render,
}: {
  rows: T[];
  render: (item: T) => React.ReactNode;
}) {
  if (!rows.length) return <Empty />;

  return (
    <div className="space-y-3">
      {rows.map((item, index) => (
        <article key={index} className="rounded-xl border p-4">
          {render(item)}
        </article>
      ))}
    </div>
  );
}

function DataTable({
  rows,
  columns,
}: {
  rows: RecordValue[];
  columns: Array<[string, string]>;
}) {
  if (!rows.length) return <Empty />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase text-slate-500">
          <tr>
            {columns.map(([key, label]) => (
              <th key={key} className="px-3 py-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {columns.map(([key]) => (
                <td key={key} className="max-w-md px-3 py-3 align-top">
                  {/data|em$|abertura|fechamento/i.test(key)
                    ? date(row[key])
                    : text(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <p className="p-6 text-center text-sm text-slate-500">Sem registros.</p>
  );
}
