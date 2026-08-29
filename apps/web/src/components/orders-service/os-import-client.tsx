"use client";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

type Preview = {
  arquivo: string;
  validas: number;
  rejeitadas: number;
  amostra: Array<Record<string, unknown>>;
  erros: Array<{ linha: number; motivo: string }>;
};
type Result = {
  total: number;
  incluidos: number;
  alterados: number;
  ignorados: number;
  rejeitados: number;
  importacaoId?: string;
  duracaoMs?: number;
};
export function OsImportClient({ canManage }: { canManage: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function send(action: "previa" | "executar") {
    if (!file) return setError("Selecione uma planilha .xlsx.");
    setLoading(true);
    setError("");
    setResult(null);
    const form = new FormData();
    form.set("arquivo", file);
    const response = await fetch(
      `/api/ordens-servico/importacao?acao=${action}`,
      { method: "POST", body: form },
    );
    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || "Resposta inválida" };
    }
    if (!response.ok) setError(String(data.message || "Falha na importação."));
    else if (action === "previa") setPreview(data as unknown as Preview);
    else {
      setResult(data as unknown as Result);
      setPreview(null);
    }
    setLoading(false);
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Importação de Ordens de Serviço</h1>
        <p className="text-sm text-slate-500">
          Pré-visualize a planilha antes de atualizar as OS.
        </p>
      </header>
      <section className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-5">
          <FileSpreadsheet className="h-6 w-6" />
          <span>{file?.name || "Selecionar planilha .xlsx"}</span>
          <input
            className="hidden"
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPreview(null);
              setResult(null);
            }}
          />
        </label>
        <div className="mt-4 flex gap-3">
          <button
            disabled={loading || !file}
            onClick={() => send("previa")}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            Pré-visualizar
          </button>
          {canManage && (
            <button
              disabled={loading || !preview}
              onClick={() => send("executar")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Importar
            </button>
          )}
        </div>
      </section>
      {error && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {result && (
        <div className="flex gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          Concluída: {result.total} processadas, {result.incluidos} incluídas,{" "}
          {result.alterados} alteradas, {result.ignorados} ignoradas e{" "}
          {result.rejeitados} rejeitadas.
        </div>
      )}
      {preview && (
        <section className="rounded-2xl border bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="font-semibold">
            Prévia: {preview.validas} válidas, {preview.rejeitadas} rejeitadas
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {["OS", "Cliente", "Tipo", "Situação", "Status"].map((x) => (
                    <th key={x} className="border-b p-2 text-left">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.amostra.map((r, i) => (
                  <tr key={i}>
                    {["numero", "cliente", "tipo", "situacao", "status"].map(
                      (k) => (
                        <td key={k} className="border-b p-2">
                          {String(r[k] ?? "")}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.erros.length > 0 && (
            <div className="mt-4 text-sm text-amber-700">
              {preview.erros.slice(0, 10).map((e) => (
                <div key={`${e.linha}-${e.motivo}`}>
                  Linha {e.linha}: {e.motivo}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
