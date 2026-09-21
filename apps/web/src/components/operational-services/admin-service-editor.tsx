"use client";

import { FileText, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ServiceData = {
  id: string;
  proposta: string | null;
  cliente: string;
  clienteLocal: string | null;
  contrato: string | null;
  pedido: string | null;
  contatoNome: string | null;
  contatoEmail: string | null;
  contatoTelefone: string | null;
  enderecoInstalacao: string | null;
  titulo: string | null;
  categoria: string | null;
  tipoProposta: string | null;
  ufExecucao: string | null;
  servicoAtividade: string | null;
  responsavel: string | null;
  prioridade: string | null;
  status: string;
  percentual: number | string;
  dataAprovacao: string | null;
  inicioPlanejado: string | null;
  prazoFinal: string | null;
  inicioReal: string | null;
  conclusaoReal: string | null;
  observacoes: string | null;
  propostaPdf: string | null;
  propostaPdfNome: string | null;
};

type Option = { nome: string };
type Person = { id: string; nome: string; funcoes: Array<{ funcao: string }> };
type ProposalType = { tipo: string; area: string; ativo: boolean };

const UFS = ["RJ", "SP", "MG", "ES", "BA", "PR", "SC", "RS", "DF", "GO"];

function messageOf(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(". ") : message;
  }
  return undefined;
}

function isoDate(value: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

function formatDate(value: string | null) {
  if (!value) return "Não definido";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString("pt-BR");
}

export function AdminServiceEditor({
  serviceId,
  canEditType,
  onClose,
  onSaved,
}: {
  serviceId: string;
  canEditType: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [service, setService] = useState<ServiceData | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);
  const [priorities, setPriorities] = useState<Option[]>([]);
  const [types, setTypes] = useState<ProposalType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    cliente: "", clienteLocal: "", contrato: "", pedido: "",
    contatoNome: "", contatoEmail: "", contatoTelefone: "",
    enderecoInstalacao: "", titulo: "", categoria: "",
    dataAprovacao: "", inicioPlanejado: "", prazoFinal: "",
    diasPreparacao: "", tempoExecucaoDias: "", percentual: "",
    proximaAcao: "", ultimaSituacao: "",
    tipoProposta: "",
    ufExecucao: "",
    servicoAtividade: "",
    responsavel: "",
    prioridade: "",
    status: "",
    inicioReal: "",
    conclusaoReal: "",
    observacoes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [servicoRes, pessoasRes, statusRes, prioridadeRes] =
      await Promise.all([
        fetch(`/api/operacional/servicos/${serviceId}`, {
          cache: "no-store",
        }),
        fetch("/api/operacional/servicos/responsaveis-elegiveis", {
          cache: "no-store",
        }),
        fetch("/api/operacional/listas?tipo=status", {
          cache: "no-store",
        }),
        fetch("/api/operacional/listas?tipo=prioridade", {
          cache: "no-store",
        }),
      ]);

    const servico = await servicoRes.json().catch(() => null);

    if (!servicoRes.ok) {
      setError(messageOf(servico) ?? "Não foi possível carregar o serviço.");
      setLoading(false);
      return;
    }

    const pessoas = await pessoasRes.json().catch(() => []);
    const statusList = await statusRes.json().catch(() => []);
    const prioridadeList = await prioridadeRes.json().catch(() => []);

    setService(servico as ServiceData);
    setPeople(Array.isArray(pessoas) ? pessoas : []);
    setStatuses(Array.isArray(statusList) ? statusList : []);
    setPriorities(Array.isArray(prioridadeList) ? prioridadeList : []);

    if (canEditType) {
      const typesRes = await fetch("/api/ferramentas/tipos-proposta", {
        cache: "no-store",
      });

      const typeList = await typesRes.json().catch(() => []);

      if (typesRes.ok && Array.isArray(typeList)) {
        setTypes(typeList as ProposalType[]);
      }
    }

    setForm({
      cliente: servico.cliente ?? "", clienteLocal: servico.clienteLocal ?? "",
      contrato: servico.contrato ?? "", pedido: servico.pedido ?? "",
      contatoNome: servico.contatoNome ?? "", contatoEmail: servico.contatoEmail ?? "",
      contatoTelefone: servico.contatoTelefone ?? "", enderecoInstalacao: servico.enderecoInstalacao ?? "",
      titulo: servico.titulo ?? "", categoria: servico.categoria ?? "",
      dataAprovacao: isoDate(servico.dataAprovacao), inicioPlanejado: isoDate(servico.inicioPlanejado),
      prazoFinal: isoDate(servico.prazoFinal), diasPreparacao: String((servico as ServiceData & {diasPreparacao?:number}).diasPreparacao ?? ""),
      tempoExecucaoDias: String((servico as ServiceData & {tempoExecucaoDias?:number|null}).tempoExecucaoDias ?? ""),
      percentual: String(servico.percentual ?? ""), proximaAcao: (servico as ServiceData & {proximaAcao?:string|null}).proximaAcao ?? "",
      ultimaSituacao: (servico as ServiceData & {ultimaSituacao?:string|null}).ultimaSituacao ?? "",
      tipoProposta: servico.tipoProposta ?? "",
      ufExecucao: servico.ufExecucao ?? "",
      servicoAtividade: servico.servicoAtividade ?? "",
      responsavel: servico.responsavel ?? "",
      prioridade: servico.prioridade ?? "",
      status: servico.status ?? "",
      inicioReal: isoDate(servico.inicioReal),
      conclusaoReal: isoDate(servico.conclusaoReal),
      observacoes: servico.observacoes ?? "",
    });

    setLoading(false);
  }, [serviceId, canEditType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  function change(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.status.trim()) {
      setError("O status é obrigatório.");
      return;
    }

    setSaving(true);
    setError("");

    const payload: Record<string, string | number | null> = {
      cliente: form.cliente, clienteLocal: form.clienteLocal || null, contrato: form.contrato || null,
      pedido: form.pedido || null, contatoNome: form.contatoNome || null, contatoEmail: form.contatoEmail || null,
      contatoTelefone: form.contatoTelefone || null, enderecoInstalacao: form.enderecoInstalacao || null,
      titulo: form.titulo || null, categoria: form.categoria || null, dataAprovacao: form.dataAprovacao || null,
      inicioPlanejado: form.inicioPlanejado || null, prazoFinal: form.prazoFinal || null,
      diasPreparacao: Number(form.diasPreparacao || 0), tempoExecucaoDias: form.tempoExecucaoDias ? Number(form.tempoExecucaoDias) : null,
      percentual: Number(form.percentual || 0), proximaAcao: form.proximaAcao || null, ultimaSituacao: form.ultimaSituacao || null,
      ufExecucao: form.ufExecucao || null,
      servicoAtividade: form.servicoAtividade,
      responsavel: form.responsavel || null,
      prioridade: form.prioridade || null,
      status: form.status,
      inicioReal: form.inicioReal || null,
      conclusaoReal: form.conclusaoReal || null,
      observacoes: form.observacoes || null,
    };

    if (canEditType) {
      payload.tipoProposta = form.tipoProposta || null;
    }

    const response = await fetch(`/api/operacional/servicos/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(messageOf(data) ?? "Não foi possível salvar o serviço.");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-950"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-red-600">Operacional</p>
            <h2 className="text-xl font-bold">Editar serviço</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {loading || !service ? (
          <p className="p-8 text-center text-slate-500">
            Carregando serviço...
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-3 dark:bg-slate-900">
              <ReadOnly label="Proposta" value={service.proposta ?? "—"} />
              <ReadOnly label="Cliente" value={service.cliente} />
              <ReadOnly
                label="Aprovação"
                value={formatDate(service.dataAprovacao)}
              />
              <ReadOnly
                label="Início planejado"
                value={formatDate(service.inicioPlanejado)}
              />
              <ReadOnly
                label="Prazo final"
                value={formatDate(service.prazoFinal)}
              />
              <ReadOnly
                label="Progresso"
                value={`${Math.round(Number(service.percentual || 0) * 100)}%`}
              />
            </div>

            {service.propostaPdf && (
              <a
                href={`/api/operacional/servicos/${serviceId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                <FileText size={16} />
                {service.propostaPdfNome ?? "PDF da proposta"}
              </a>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {([
                ["cliente", "Cliente"], ["clienteLocal", "Local"], ["contrato", "Contrato"], ["pedido", "Pedido"],
                ["contatoNome", "Contato"], ["contatoEmail", "E-mail do contato"], ["contatoTelefone", "Telefone"],
                ["enderecoInstalacao", "Endereço de instalação"], ["titulo", "Título"], ["categoria", "Categoria"],
                ["dataAprovacao", "Data de aprovação", "date"], ["inicioPlanejado", "Início planejado", "date"],
                ["prazoFinal", "Prazo final", "date"], ["diasPreparacao", "Dias de preparação", "number"],
                ["tempoExecucaoDias", "Dias de execução", "number"], ["percentual", "Percentual (0 a 1)", "number"],
              ] as const).map(([field,label,type]) => (
                <label key={field} className="text-sm">{label}<input type={type ?? "text"} step={field === "percentual" ? "0.01" : undefined} min={type === "number" ? 0 : undefined} max={field === "percentual" ? 1 : undefined} value={form[field]} onChange={(event) => change(field, event.target.value)} className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700" /></label>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">Próxima ação<textarea value={form.proximaAcao} onChange={(e) => change("proximaAcao", e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border bg-transparent p-3" /></label>
              <label className="text-sm">Última situação<textarea value={form.ultimaSituacao} onChange={(e) => change("ultimaSituacao", e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border bg-transparent p-3" /></label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                Tipo de proposta
                <select
                  value={form.tipoProposta}
                  disabled={!canEditType}
                  onChange={(event) =>
                    change("tipoProposta", event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-3 disabled:opacity-60 dark:border-slate-700"
                >
                  <option value="">Selecione</option>
                  {canEditType
                    ? types.map((item) => (
                        <option key={item.tipo} value={item.tipo}>
                          {item.tipo} ({item.area})
                        </option>
                      ))
                    : form.tipoProposta && (
                        <option value={form.tipoProposta}>
                          {form.tipoProposta}
                        </option>
                      )}
                </select>
              </label>

              <label className="text-sm">
                UF de execução
                <select
                  value={form.ufExecucao}
                  onChange={(event) => change("ufExecucao", event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                >
                  <option value="">Selecione</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                Responsável
                <select
                  value={form.responsavel}
                  onChange={(event) =>
                    change("responsavel", event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                >
                  <option value="">Não definido</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.nome}>
                      {person.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                Prioridade
                <select
                  value={form.prioridade}
                  onChange={(event) => change("prioridade", event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                >
                  <option value="">Selecione</option>
                  {priorities.map((item) => (
                    <option key={item.nome} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                Status
                <select
                  required
                  value={form.status}
                  onChange={(event) => change("status", event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                >
                  <option value="">Selecione</option>
                  {statuses.map((item) => (
                    <option key={item.nome} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                Início real
                <input
                  type="date"
                  value={form.inicioReal}
                  onChange={(event) => change("inicioReal", event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                />
              </label>

              <label className="text-sm">
                Conclusão real
                <input
                  type="date"
                  value={form.conclusaoReal}
                  onChange={(event) =>
                    change("conclusaoReal", event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                />
              </label>
            </div>

            <label className="block text-sm">
              Serviço / atividade
              <textarea
                value={form.servicoAtividade}
                onChange={(event) =>
                  change("servicoAtividade", event.target.value)
                }
                className="mt-1 min-h-24 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
              />
            </label>

            <label className="block text-sm">
              Observações
              <textarea
                value={form.observacoes}
                onChange={(event) => change("observacoes", event.target.value)}
                className="mt-1 min-h-20 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border px-4 py-2.5 dark:border-slate-700"
              >
                Cancelar
              </button>

              <button
                disabled={saving}
                className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
