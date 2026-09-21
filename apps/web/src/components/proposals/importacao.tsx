"use client";
import { AlertTriangle, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateServiceFromProposalDialog } from "./create-service-from-proposal-dialog";
type ImportPreview = {
  totalLinhas?: number;
  propostasValidas?: number;
  novas?: number;
  atualizadas?: number;
  semMudancas?: number;
  cancelamento?: { quantidade?: number };
};

type ImportHistory = {
  id?: number | string;
  importadoEm: string;
  criadoEm?: string;
  origem?: string;
  totalLinhas?: number;
  novas?: number;
  atualizadas?: number;
  canceladas?: number;
  usuario?: string;
};

type ProposalConfiguration = {
  chave?: string;
  valor?: string | number;
};

type ProposalPanel = {
  diasInatividade?: number;
  inativas?: { quantidade?: number };
};

export function ProposalsImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [dias, setDias] = useState(90);
  const [elegiveis, setElegiveis] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inactiveMsg, setInactiveMsg] = useState("");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const historyLoad = () =>
    void fetch("/api/propostas/importacoes?limite=50")
      .then((r) => r.json())
      .then(setHistory);
  useEffect(() => {
    historyLoad();
    void loadInactivity();
  }, []);
  async function loadInactivity() {
    const [cfg, panel] = await Promise.all([
      fetch("/api/propostas/configuracoes", {
        cache: "no-store",
      }).then(
        (response) => response.json() as Promise<ProposalConfiguration[]>,
      ),
      fetch("/api/propostas/painel", {
        cache: "no-store",
      }).then((response) => response.json() as Promise<ProposalPanel>),
    ]);
    const item = Array.isArray(cfg)
      ? cfg.find((item) => item.chave === "prop_dias_cancela")
      : null;
    const value = Number(item?.valor || panel?.diasInatividade || 90);
    setDias(Number.isFinite(value) ? value : 90);
    setElegiveis(Number(panel?.inativas?.quantidade || 0));
  }
  async function saveDays() {
    const value = Math.max(1, Math.min(3650, Number(dias) || 90));
    setDias(value);
    setInactiveMsg("");
    const r = await fetch("/api/propostas/configuracoes/prop_dias_cancela", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor: value }),
    });
    const b = await r.json();
    setInactiveMsg(
      r.ok
        ? `Prazo atualizado para ${value} dias.`
        : b.message || "Não foi possível salvar o prazo.",
    );
    if (r.ok) await loadInactivity();
  }
  async function processInactive() {
    setProcessing(true);
    setInactiveMsg("");
    const r = await fetch("/api/propostas/processar-inativas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias }),
    });
    const b = await r.json();
    if (r.ok) {
      setConfirmOpen(false);
      setInactiveMsg(`${Number(b.quantidade || 0)} proposta(s) inativada(s).`);
      historyLoad();
      await loadInactivity();
    } else
      setInactiveMsg(b.message || "Não foi possível inativar as propostas.");
    setProcessing(false);
  }
  async function send(path: string) {
    if (!file) return;
    setBusy(true);
    const f = new FormData();
    f.append("arquivo", file);
    const r = await fetch(`/api/propostas/${path}`, {
      method: "POST",
      body: f,
    });
    const b = await r.json();
    if (!r.ok) setMsg(b.message || "Erro");
    else if (path.includes("previa")) {
      setPreview(b);
      setMsg("Prévia concluída sem gravação.");
    } else {
      setPreview(null);
      setMsg(
        `Importação concluída: ${b.novas || 0} novas e ${b.atualizadas || 0} atualizadas.`,
      );
      historyLoad();
      setServiceDialogOpen(true);
    }
    setBusy(false);
  }
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold text-red-600">Propostas</p>
        <h2 className="text-2xl font-bold">Importação</h2>
        <p className="text-sm text-slate-500">
          Prévia, confirmação e histórico das planilhas XLSX.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 dark:bg-slate-950">
          <h3 className="mb-3 font-bold">Planilha</h3>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPreview(null);
            }}
            className="w-full rounded-xl border p-3"
          />
          <div className="mt-4 flex gap-3">
            <button
              disabled={!file || busy}
              onClick={() => void send("importar/previa")}
              className="rounded-xl border px-4 py-2 disabled:opacity-40"
            >
              Gerar prévia
            </button>
            <button
              disabled={!preview || busy}
              onClick={() => void send("importar")}
              className="rounded-xl bg-red-600 px-4 py-2 text-white disabled:opacity-40"
            >
              Confirmar importação
            </button>
          </div>
          {msg && (
            <p className="mt-4 rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
              {msg}
            </p>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-5 dark:bg-slate-950">
          <h3 className="mb-3 font-bold">Prévia sem gravação</h3>
          {!preview ? (
            <p className="text-slate-500">Nenhuma prévia gerada.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Linhas", preview.totalLinhas],
                ["Válidas", preview.propostasValidas],
                ["Novas", preview.novas],
                ["Atualizadas", preview.atualizadas],
                ["Sem mudanças", preview.semMudancas],
                ["Canceláveis", preview.cancelamento?.quantidade || 0],
              ].map(([l, v]) => (
                <div
                  key={String(l)}
                  className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"
                >
                  <p className="text-xs text-slate-500">{l}</p>
                  <b className="text-xl">{v}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <section className="mt-5 rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Settings size={20} />
            </span>
            <div>
              <h3 className="font-bold">Inatividade automática</h3>
              <p className="text-sm text-slate-500">
                Processamento complementar à importação, usando a data de
                cadastro e o prazo configurado.
              </p>
              <p className="mt-1 text-sm">
                <b>{elegiveis}</b> proposta(s) elegível(is).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium">
                Quantidade de dias
              </span>
              <input
                type="number"
                min={1}
                max={3650}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="w-32 rounded-xl border bg-transparent px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveDays()}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Salvar prazo
            </button>
            <button
              type="button"
              disabled={processing || elegiveis === 0}
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} />
                Inativar propostas
              </span>
            </button>
          </div>
        </div>
        {inactiveMsg && (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
            {inactiveMsg}
          </p>
        )}
      </section>
      <div className="mt-5 overflow-x-auto rounded-2xl border bg-white dark:bg-slate-950">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {[
                "Data",
                "Origem",
                "Linhas",
                "Novas",
                "Atualizadas",
                "Canceladas",
                "Usuário",
              ].map((x) => (
                <th key={x} className="px-4 py-3 text-left">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={String(h.id)} className="border-t dark:border-slate-800">
                <td className="px-4 py-3">
                  {new Date(h.importadoEm).toLocaleString("pt-BR")}
                </td>
                <td className="px-4">{h.origem}</td>
                <td className="px-4">{h.totalLinhas}</td>
                <td className="px-4">{h.novas}</td>
                <td className="px-4">{h.atualizadas}</td>
                <td className="px-4">{h.canceladas}</td>
                <td className="px-4">{h.usuario || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CreateServiceFromProposalDialog
        open={serviceDialogOpen}
        onClose={() => setServiceDialogOpen(false)}
      />

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="mb-4 flex gap-3">
              <span className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-950/50">
                <AlertTriangle />
              </span>
              <div>
                <h3 className="text-xl font-bold">
                  Inativar propostas elegíveis?
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  A ação alterará o status de <b>{elegiveis}</b> proposta(s) com
                  mais de <b>{dias} dias</b> para CANCELADA e registrará a
                  evolução.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={processing}
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border px-4 py-2 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => void processInactive()}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {processing ? "Processando..." : "Inativar propostas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
