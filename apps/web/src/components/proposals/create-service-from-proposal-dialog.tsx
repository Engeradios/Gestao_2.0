"use client";

import { CalendarDays, FileText, Search, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Proposal = {
  id: number;
  numero: string;
  clienteNome?: string | null;
  clienteUf?: string | null;
  clienteMunicipio?: string | null;
  local?: string | null;
  enderecoInstalacao?: string | null;
  titulo?: string | null;
  tipo?: string | null;
  areaResponsavel?: string | null;
  prazoExecucaoDiasUteis?: number | null;
  configuracaoValida: boolean;
  motivoBloqueio?: string | null;
};

type Responsible = {
  id: string;
  nome: string;
  email?: string | null;
  cargo?: string | null;
  unidade?: string | null;
  funcoes: Array<{ funcao: string }>;
};

type PlanningPreview = {
  proposta: string;
  tipoProposta: string;
  areaResponsavel: "OPERACIONAL" | "LOGISTICA" | "AMBAS";
  ufExecucao: string;
  pracaResponsavel: string;
  dataAprovacao: string;
  origemDataAprovacao: "HISTORICO_STATUS" | "ATUALIZADO_EM" | "DATA_CADASTRO";
  diasPreparacao: number;
  tempoExecucaoDias: number | null;
  chegadaPrevista: string | null;
  inicioPlanejado: string | null;
  prazoFinal: string;
  calendarioEstadualDisponivel: boolean;
};

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

function messageOf(data: unknown) {
  if (data && typeof data === "object" && "message" in data) {
    const value = (data as { message?: string | string[] }).message;
    return Array.isArray(value) ? value.join(". ") : value;
  }
  return undefined;
}

function formatDate(value: string | null) {
  if (!value) return "Não se aplica";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function approvalOriginLabel(value: PlanningPreview["origemDataAprovacao"]) {
  if (value === "HISTORICO_STATUS") return "Histórico de aprovação";
  if (value === "ATUALIZADO_EM") return "Última atualização da proposta";
  return "Data de cadastro da proposta";
}

export function CreateServiceFromProposalDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [observations, setObservations] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [area, setArea] = useState("");
  const [uf, setUf] = useState("");
  const [square, setSquare] = useState("");
  const [executionDays, setExecutionDays] = useState("");
  const [preview, setPreview] = useState<PlanningPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [proposalResponse, responsibleResponse] = await Promise.all([
      fetch("/api/operacional/servicos/propostas-aprovadas-sem-servico", {
        cache: "no-store",
      }),
      fetch("/api/operacional/servicos/responsaveis-elegiveis", {
        cache: "no-store",
      }),
    ]);
    const proposalData = await proposalResponse.json().catch(() => null);
    const responsibleData = await responsibleResponse.json().catch(() => null);
    if (!proposalResponse.ok || !responsibleResponse.ok) {
      setError(
        messageOf(proposalData) ??
          messageOf(responsibleData) ??
          "Não foi possível carregar os dados.",
      );
      setLoading(false);
      return;
    }
    setProposals(Array.isArray(proposalData) ? proposalData : []);
    setResponsibles(Array.isArray(responsibleData) ? responsibleData : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [open, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return proposals;
    return proposals.filter((proposal) =>
      `${proposal.numero} ${proposal.clienteNome ?? ""} ${proposal.tipo ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [proposals, search]);

  const executionRequired = area === "OPERACIONAL" || area === "AMBAS";

  function choose(proposal: Proposal) {
    const proposalArea = proposal.areaResponsavel?.trim().toUpperCase() ?? "";
    const proposalUf = proposal.clienteUf?.trim().toUpperCase() ?? "";
    const suggestedSquare =
      proposal.clienteMunicipio?.trim() ||
      proposal.local?.trim() ||
      proposal.enderecoInstalacao?.trim() ||
      "";
    setSelected(proposal);
    setSelectedIds([]);
    setPdf(null);
    setArea(proposalArea);
    setUf(UFS.includes(proposalUf) ? proposalUf : "");
    setSquare(suggestedSquare);
    setExecutionDays(
      proposalArea === "LOGISTICA"
        ? ""
        : (proposal.prazoExecucaoDiasUteis?.toString() ?? ""),
    );
    setPreview(null);
    setPreviewError("");
    setError("");
    setSuccess("");
  }

  function toggleResponsible(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  const requestPreview = useCallback(async () => {
    if (!selected || !area || !uf || !square.trim()) {
      setPreview(null);
      setPreviewError("");
      return;
    }
    if (executionRequired && (!executionDays || Number(executionDays) <= 0)) {
      setPreview(null);
      setPreviewError("");
      return;
    }
    setPreviewing(true);
    setPreviewError("");
    const response = await fetch(
      "/api/operacional/servicos/planejamento/previa",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposta: selected.numero,
          areaResponsavel: area,
          ufExecucao: uf,
          pracaResponsavel: square.trim(),
          tempoExecucaoDias: executionRequired ? executionDays : undefined,
        }),
      },
    );
    const data = await response.json().catch(() => null);
    setPreviewing(false);
    if (!response.ok) {
      setPreview(null);
      setPreviewError(messageOf(data) ?? "Não foi possível calcular a prévia.");
      return;
    }
    setPreview(data as PlanningPreview);
  }, [selected, area, uf, square, executionDays, executionRequired]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => void requestPreview(), 450);
    return () => window.clearTimeout(timer);
  }, [selected, area, uf, square, executionDays, requestPreview]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return setError("Selecione uma proposta.");
    if (!area) return setError("A proposta não possui área válida.");
    if (!uf) return setError("Selecione a UF responsável.");
    if (!square.trim()) return setError("Informe a praça responsável.");
    if (executionRequired && (!executionDays || Number(executionDays) <= 0)) {
      return setError("Informe os dias úteis necessários para execução.");
    }
    if (!preview) return setError("Aguarde uma prévia válida do planejamento.");
    if (!pdf) return setError("Selecione o PDF da proposta.");

    setSaving(true);
    setError("");
    setSuccess("");
    const form = new FormData();
    form.append("proposta", selected.numero);
    form.append("responsaveis", JSON.stringify(selectedIds));
    form.append("prioridade", priority);
    form.append("observacoes", observations.trim());
    form.append("areaResponsavel", area);
    form.append("ufExecucao", uf);
    form.append("pracaResponsavel", square.trim());
    if (executionRequired) form.append("tempoExecucaoDias", executionDays);
    form.append("pdf", pdf);

    const response = await fetch(
      "/api/operacional-upload/servicos/importacao",
      {
        method: "POST",
        body: form,
      },
    );
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(messageOf(data) ?? "Não foi possível criar o serviço.");
      return;
    }
    setSuccess(`Serviço da proposta ${selected.numero} criado com sucesso.`);
    setProposals((current) =>
      current.filter((proposal) => proposal.id !== selected.id),
    );
    setSelected(null);
    setSelectedIds([]);
    setObservations("");
    setPdf(null);
    setPreview(null);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 p-2 sm:p-4">
      <div className="mx-auto flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <header className="flex items-start justify-between border-b p-5 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-red-600">Serviços</p>
            <h2 className="text-xl font-bold">
              Propostas aprovadas sem serviço
            </h2>
            <p className="text-sm text-slate-500">
              Selecione uma proposta e confirme o planejamento.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </header>
        <div className="grid flex-1 overflow-hidden lg:grid-cols-[420px_1fr]">
          <aside className="overflow-y-auto border-r p-4 dark:border-slate-800">
            <label className="mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 dark:border-slate-700">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Número, cliente ou tipo..."
                className="w-full bg-transparent outline-none"
              />
            </label>
            {loading ? (
              <p className="text-sm text-slate-500">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                Nenhuma proposta aprovada pendente.
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((proposal) => (
                  <button
                    type="button"
                    key={proposal.id}
                    disabled={!proposal.configuracaoValida}
                    onClick={() => choose(proposal)}
                    className={`w-full rounded-2xl border p-4 text-left ${selected?.id === proposal.id ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-slate-200 dark:border-slate-800"} disabled:opacity-50`}
                  >
                    <div className="flex justify-between gap-3">
                      <strong>Proposta {proposal.numero}</strong>
                      <span className="text-xs font-semibold text-red-600">
                        {proposal.areaResponsavel ?? "Sem área"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      {proposal.clienteNome || "Cliente não informado"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {proposal.tipo || "Sem tipo"} ·{" "}
                      {proposal.prazoExecucaoDiasUteis ?? "-"} dias úteis
                    </p>
                    {proposal.motivoBloqueio && (
                      <p className="mt-2 text-xs text-amber-600">
                        {proposal.motivoBloqueio}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </aside>
          <main className="overflow-y-auto p-5">
            {!selected ? (
              <div className="grid min-h-72 place-items-center text-center text-slate-500">
                <div>
                  <FileText className="mx-auto mb-3" size={38} />
                  Selecione uma proposta para continuar.
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 dark:bg-slate-900">
                  <p>
                    <b>Cliente:</b> {selected.clienteNome}
                  </p>
                  <p>
                    <b>Local:</b>{" "}
                    {selected.local ||
                      selected.enderecoInstalacao ||
                      selected.clienteMunicipio ||
                      "-"}
                  </p>
                  <p>
                    <b>Tipo:</b> {selected.tipo}
                  </p>
                  <p>
                    <b>Área configurada:</b> {area || "-"}
                  </p>
                </div>

                <section className="rounded-2xl border p-4 dark:border-slate-800">
                  <h3 className="mb-4 font-semibold">Dados do planejamento</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-sm">
                      Área responsável
                      <input
                        value={area}
                        readOnly
                        aria-readonly="true"
                        className="mt-2 w-full rounded-xl border bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </label>
                    <label className="text-sm">
                      UF responsável
                      <select
                        required
                        value={uf}
                        onChange={(event) => {
                          setUf(event.target.value);
                          setPreview(null);
                        }}
                        className="mt-2 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                      >
                        <option value="">Selecione</option>
                        {UFS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      Praça responsável
                      <input
                        required
                        maxLength={160}
                        value={square}
                        onChange={(event) => {
                          setSquare(event.target.value);
                          setPreview(null);
                        }}
                        placeholder="Município ou praça operacional"
                        className="mt-2 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                      />
                    </label>
                    {executionRequired && (
                      <label className="text-sm">
                        Dias úteis para execução
                        <input
                          required
                          type="number"
                          min={1}
                          max={365}
                          step={1}
                          value={executionDays}
                          onChange={(event) => {
                            setExecutionDays(event.target.value);
                            setPreview(null);
                          }}
                          className="mt-2 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                        />
                      </label>
                    )}
                  </div>
                </section>

                <section
                  className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20"
                  aria-live="polite"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays size={18} />
                    <h3 className="font-semibold">Planejamento previsto</h3>
                    {previewing && (
                      <span className="text-xs text-slate-500">
                        Calculando...
                      </span>
                    )}
                  </div>
                  {previewError && (
                    <p
                      role="alert"
                      className="text-sm text-red-700 dark:text-red-300"
                    >
                      {previewError}
                    </p>
                  )}
                  {!preview && !previewError && !previewing && (
                    <p className="text-sm text-slate-500">
                      Preencha UF, praça e os dias de execução aplicáveis.
                    </p>
                  )}
                  {preview && (
                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <span className="block text-xs text-slate-500">
                          Aprovação
                        </span>
                        <strong>{formatDate(preview.dataAprovacao)}</strong>
                        <span className="block text-xs text-slate-500">
                          {approvalOriginLabel(preview.origemDataAprovacao)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">
                          Chegada prevista
                        </span>
                        <strong>{formatDate(preview.chegadaPrevista)}</strong>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">
                          Início planejado
                        </span>
                        <strong>{formatDate(preview.inicioPlanejado)}</strong>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">
                          Prazo final
                        </span>
                        <strong>{formatDate(preview.prazoFinal)}</strong>
                      </div>
                    </div>
                  )}
                  {preview && !preview.calendarioEstadualDisponivel && (
                    <p
                      role="status"
                      className="mt-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      Não há calendário estadual cadastrado para{" "}
                      {preview.ufExecucao}. A prévia considera fins de semana e
                      feriados nacionais cadastrados.
                    </p>
                  )}
                </section>

                <div>
                  <p className="mb-2 text-sm font-semibold">Responsáveis</p>
                  <div className="grid max-h-56 gap-2 overflow-y-auto md:grid-cols-2">
                    {responsibles.map((person) => (
                      <label
                        key={person.id}
                        className="flex items-start gap-3 rounded-xl border p-3 dark:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(person.id)}
                          onChange={() => toggleResponsible(person.id)}
                        />
                        <span>
                          <strong className="block text-sm">
                            {person.nome}
                          </strong>
                          <span className="text-xs text-slate-500">
                            {person.funcoes
                              .map((item) => item.funcao)
                              .join(", ")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    Prioridade
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value)}
                      className="mt-2 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                    >
                      <option value="BAIXA">Baixa</option>
                      <option value="NORMAL">Normal</option>
                      <option value="ALTA">Alta</option>
                      <option value="URGENTE">Urgente</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    PDF da proposta
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      required
                      onChange={(event) =>
                        setPdf(event.target.files?.[0] ?? null)
                      }
                      className="mt-2 w-full rounded-xl border p-3 dark:border-slate-700"
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  Observações
                  <textarea
                    value={observations}
                    onChange={(event) => setObservations(event.target.value)}
                    className="mt-2 min-h-20 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                  />
                </label>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
                  >
                    {error}
                  </p>
                )}
                {success && (
                  <p
                    role="status"
                    className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    {success}
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-xl border px-4 py-2.5"
                  >
                    Voltar
                  </button>
                  <button
                    disabled={saving || previewing || !preview}
                    className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Criando..." : "Criar serviço"}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
