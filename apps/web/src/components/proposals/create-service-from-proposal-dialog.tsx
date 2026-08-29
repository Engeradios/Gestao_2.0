"use client";

import { FileText, Search, X } from "lucide-react";
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

function messageOf(data: unknown) {
  if (data && typeof data === "object" && "message" in data) {
    const value = (data as { message?: string | string[] }).message;
    return Array.isArray(value) ? value.join(". ") : value;
  }

  return undefined;
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

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

  function choose(proposal: Proposal) {
    setSelected(proposal);
    setSelectedIds([]);
    setPdf(null);
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

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!selected) return setError("Selecione uma proposta.");
    if (!pdf) return setError("Selecione o PDF da proposta.");

    setSaving(true);
    setError("");
    setSuccess("");

    const form = new FormData();
    form.append("proposta", selected.numero);
    form.append("responsaveis", JSON.stringify(selectedIds));
    form.append("prioridade", priority);
    form.append("observacoes", observations.trim());
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
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 p-4">
      <div className="mx-auto flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <header className="flex items-start justify-between border-b p-5 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-red-600">Serviços</p>
            <h2 className="text-xl font-bold">
              Propostas aprovadas sem serviço
            </h2>
            <p className="text-sm text-slate-500">
              Selecione uma proposta e complete a abertura.
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
                    className={`w-full rounded-2xl border p-4 text-left ${
                      selected?.id === proposal.id
                        ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                        : "border-slate-200 dark:border-slate-800"
                    } disabled:opacity-50`}
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
                    <b>Área:</b> {selected.areaResponsavel}
                  </p>
                  <p>
                    <b>Prazo:</b> {selected.prazoExecucaoDiasUteis} dias úteis
                  </p>
                </div>

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
                  <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
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
                    disabled={saving}
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
