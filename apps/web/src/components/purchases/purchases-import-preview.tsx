"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

type Sample = {
  line: number;
  proposalNumber: string;
  productCode: string;
  productDescription: string;
  quantity: string | number;
  clientName?: string | null;
  status: string;
};
type Rejection = {
  line: number;
  proposalNumber?: string | null;
  productCode?: string | null;
  status?: string | null;
  reason: string;
};
type Preview = {
  arquivo: string;
  totalLinhas: number;
  linhasAprovadas: number;
  linhasRejeitadas: number;
  propostas: number;
  amostra: Sample[];
  rejeicoes: Rejection[];
};
type ImportResult = {
  id: string;
  status: string;
  arquivo: string;
  totalLinhas: number;
  linhasAprovadas: number;
  linhasRejeitadas: number;
  itensNovos: number;
  itensAtualizados: number;
};

function messageOf(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(". ") : message;
  }
  return undefined;
}

async function parseResponse(response: Response) {
  const raw = await response.text();
  try {
    return raw ? (JSON.parse(raw) as unknown) : {};
  } catch {
    throw new Error("Resposta inválida recebida do servidor.");
  }
}

export function PurchasesImportPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");

  function validateFile() {
    if (!file) throw new Error("Selecione uma planilha XLSX.");
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new Error("O arquivo deve possuir extensão .xlsx.");
    }
    return file;
  }

  async function request(action: "previa" | "executar") {
    const selected = validateFile();
    const form = new FormData();
    form.set("arquivo", selected);
    const response = await fetch(`/api/compras/importacao?acao=${action}`, {
      method: "POST",
      body: form,
    });
    const data = await parseResponse(response);
    if (!response.ok) {
      throw new Error(messageOf(data) ?? "Não foi possível processar a planilha.");
    }
    return data;
  }

  async function generatePreview() {
    setLoading(true);
    setError("");
    setPreview(null);
    setResult(null);
    setConfirmation("");
    setAcknowledged(false);
    try {
      setPreview((await request("previa")) as Preview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar a prévia.");
    } finally {
      setLoading(false);
    }
  }

  async function executeImport() {
    if (!preview) return;
    if (!acknowledged || confirmation.trim().toUpperCase() !== "IMPORTAR") {
      setError('Marque a confirmação e digite IMPORTAR para continuar.');
      return;
    }
    setExecuting(true);
    setError("");
    try {
      setResult((await request("executar")) as ImportResult);
      setPreview(null);
      setConfirmation("");
      setAcknowledged(false);
      setFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a importação.");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-red-600">Compras</p>
        <h1 className="mt-1 text-3xl font-bold">Importação de materiais aprovados</h1>
        <p className="mt-2 text-sm text-slate-500">
          Gere a prévia, revise as aprovações e rejeições e confirme explicitamente antes da gravação.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <ShieldCheck size={20} />
          <p>Somente linhas com Status APROVADO e propostas ainda não importadas serão gravadas.</p>
        </div>
        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-5 dark:border-slate-700">
          <FileSpreadsheet className="text-red-600" />
          <span>{file?.name ?? "Selecionar planilha .xlsx"}</span>
          <input
            className="hidden"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
              setError("");
            }}
          />
        </label>
        <button type="button" disabled={!file || loading || executing} onClick={() => void generatePreview()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white disabled:opacity-40">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
          {loading ? "Analisando..." : "Gerar prévia"}
        </button>
      </section>

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertCircle size={20} />{error}</div>}
      {result && <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><div className="flex items-center gap-2 font-bold"><CheckCircle2 />Importação concluída</div><p className="mt-2 text-sm">ID: {result.id} · {result.itensNovos} itens novos · {result.linhasRejeitadas} linhas rejeitadas.</p></section>}

      {preview && <>
        <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 size={20} />Prévia concluída sem gravação.</div>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Linhas" value={preview.totalLinhas} /><Metric label="Aprovadas" value={preview.linhasAprovadas} /><Metric label="Rejeitadas" value={preview.linhasRejeitadas} /><Metric label="Propostas" value={preview.propostas} /></section>
        <section className="overflow-hidden rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950"><div className="border-b p-4 dark:border-slate-800"><h2 className="font-bold">Amostra aprovada</h2><p className="text-sm text-slate-500">Até 30 itens retornados pelo backend.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left dark:bg-slate-900"><tr>{["Linha","Proposta","Cliente","Código","Produto","Quantidade","Status"].map((item)=><th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y dark:divide-slate-800">{preview.amostra.map((item)=><tr key={`${item.line}-${item.proposalNumber}-${item.productCode}`}><td className="px-4 py-3">{item.line}</td><td className="px-4 py-3 font-semibold">{item.proposalNumber}</td><td className="min-w-64 px-4 py-3">{item.clientName ?? "—"}</td><td className="px-4 py-3">{item.productCode}</td><td className="min-w-80 px-4 py-3">{item.productDescription}</td><td className="px-4 py-3">{String(item.quantity)}</td><td className="px-4 py-3 text-emerald-700">{item.status}</td></tr>)}</tbody></table></div></section>
        {preview.rejeicoes.length > 0 && <Rejections items={preview.rejeicoes} />}
        <section className="rounded-2xl border-2 border-red-200 bg-white p-6 dark:border-red-900 dark:bg-slate-950"><h2 className="text-lg font-bold">Confirmação controlada</h2><p className="mt-1 text-sm text-slate-500">A execução revalida toda a planilha. Propostas ausentes ou já importadas continuarão rejeitadas.</p><label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={acknowledged} onChange={(event)=>setAcknowledged(event.target.checked)} className="mt-1" /><span>Revisei a prévia e estou ciente de que os registros aptos serão gravados no módulo Compras.</span></label><label className="mt-4 block text-sm font-semibold">Digite IMPORTAR para confirmar<input value={confirmation} onChange={(event)=>setConfirmation(event.target.value)} className="mt-2 block w-full max-w-md rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 font-normal uppercase dark:border-slate-700" autoComplete="off" /></label><button type="button" disabled={executing || !acknowledged || confirmation.trim().toUpperCase() !== "IMPORTAR" || preview.linhasAprovadas < 1} onClick={()=>void executeImport()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 font-semibold text-white disabled:opacity-40">{executing && <Loader2 size={18} className="animate-spin" />}{executing ? "Importando..." : `Confirmar ${preview.linhasAprovadas} linhas aptas`}</button></section>
      </>}
    </main>
  );
}

function Rejections({ items }: { items: Rejection[] }) {
  return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"><h2 className="font-bold">Linhas rejeitadas</h2><div className="mt-3 overflow-x-auto rounded-xl border border-amber-200 dark:border-amber-900"><table className="min-w-full text-sm"><thead className="bg-amber-100/70 text-left dark:bg-amber-950/60"><tr>{["Linha","Proposta","Produto","Status","Motivo"].map((item)=><th key={item} className="px-3 py-2">{item}</th>)}</tr></thead><tbody className="divide-y divide-amber-200 dark:divide-amber-900">{items.map((item)=><tr key={`${item.line}-${item.proposalNumber ?? "sem-proposta"}-${item.productCode ?? "sem-produto"}`}><td className="px-3 py-2">{item.line}</td><td className="px-3 py-2 font-semibold">{item.proposalNumber ?? "Não informada"}</td><td className="px-3 py-2">{item.productCode ?? "Não informado"}</td><td className="px-3 py-2">{item.status ?? "—"}</td><td className="min-w-80 px-3 py-2">{item.reason}</td></tr>)}</tbody></table></div></section>;
}
function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>; }
