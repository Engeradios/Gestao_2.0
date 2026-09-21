"use client";

import { useState } from "react";

type PreviewItem = {
  linha: number;
  pedido: string | null;
  cliente: string | null;
  produto: string | null;
  descricao: string | null;
  quantidade: string | null;
  status: string | null;
};

type ImportError = {
  linha: number;
  motivo: string;
};

type Preview = {
  arquivo: string;
  tamanho: number;
  linhasValidas: number;
  novas: number;
  jaExistentes: number;
  duplicadasNaPlanilha: number;
  rejeitadas: number;
  amostra: PreviewItem[];
  erros: ImportError[];
};

type ImportResult = {
  sucesso: boolean;
  arquivo: string;
  inseridas: number;
  jaExistentes: number;
  duplicadasNaPlanilha: number;
  rejeitadas: number;
};

async function upload<T>(path: "previa" | "executar", file: File): Promise<T> {
  const formData = new FormData();
  formData.append("arquivo", file);

  const response = await fetch(
    `/api/estoque-logistica/importacao-pedidos/${path}`,
    {
      method: "POST",
      body: formData,
    },
  );

  const raw = await response.text();

  let body: unknown = {};

  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Resposta inválida recebida do servidor.");
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? (body as { message: unknown }).message
        : "Falha na importação.";

    throw new Error(
      Array.isArray(message) ? message.map(String).join(", ") : String(message),
    );
  }

  return body as T;
}

export function SalesOrdersImportManager() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");

  async function generatePreview() {
    if (!file) {
      setError("Selecione uma planilha XLSX.");
      return;
    }

    setLoading(true);
    setError("");
    setPreview(null);
    setResult(null);

    try {
      setPreview(await upload<Preview>("previa", file));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível gerar a prévia.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function executeImport() {
    if (!file || !preview || preview.novas === 0) return;

    const confirmed = window.confirm(
      `Confirmar a importação de ${preview.novas} linha(s) nova(s)?`,
    );

    if (!confirmed) return;

    setExecuting(true);
    setError("");

    try {
      const response = await upload<ImportResult>("executar", file);

      setResult(response);
      setPreview(await upload<Preview>("previa", file));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível executar a importação.",
      );
    } finally {
      setExecuting(false);
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="font-semibold text-red-600">Estoque e Logística</p>
        <h1 className="text-3xl font-bold">Importação de Pedidos de Vendas</h1>
        <p className="mt-2 text-slate-500">
          Prévia, validação e importação idempotente dos pedidos.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <label className="block text-sm font-semibold">Planilha XLSX</label>

        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setResult(null);
            setError("");
          }}
          className="mt-3 block w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-900"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!file || loading || executing}
            onClick={() => void generatePreview()}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "Analisando..." : "Gerar prévia"}
          </button>

          <button
            type="button"
            disabled={!preview || preview.novas === 0 || loading || executing}
            onClick={() => void executeImport()}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
          >
            {executing ? "Importando..." : "Confirmar importação"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {result && (
        <section className="rounded-2xl bg-emerald-50 p-5 text-emerald-800">
          <h2 className="font-bold">Importação concluída</h2>
          <p className="mt-1">
            {result.inseridas} inseridas e {result.jaExistentes} já existentes.
          </p>
        </section>
      )}

      {preview && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Válidas" value={preview.linhasValidas} />
            <Metric label="Novas" value={preview.novas} />
            <Metric label="Já existentes" value={preview.jaExistentes} />
            <Metric label="Duplicadas" value={preview.duplicadasNaPlanilha} />
            <Metric label="Rejeitadas" value={preview.rejeitadas} />
          </section>

          <section className="overflow-hidden rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b p-4 dark:border-slate-800">
              <h2 className="font-bold">Amostra das linhas novas</h2>
              <p className="text-sm text-slate-500">
                Até 20 registros que serão inseridos.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left dark:bg-slate-900">
                  <tr>
                    {[
                      "Linha",
                      "Pedido",
                      "Cliente",
                      "Produto",
                      "Descrição",
                      "Quantidade",
                      "Status",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y dark:divide-slate-800">
                  {preview.amostra.map((item) => (
                    <tr key={`${item.linha}-${item.produto}`}>
                      <td className="px-4 py-3">{item.linha}</td>
                      <td className="px-4 py-3 font-semibold">
                        {item.pedido || "—"}
                      </td>
                      <td className="min-w-72 px-4 py-3">
                        {item.cliente || "—"}
                      </td>
                      <td className="px-4 py-3">{item.produto || "—"}</td>
                      <td className="min-w-96 px-4 py-3">
                        {item.descricao || "—"}
                      </td>
                      <td className="px-4 py-3">{item.quantidade || "—"}</td>
                      <td className="min-w-64 px-4 py-3">
                        {item.status || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {preview.erros.length > 0 && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
              <h2 className="font-bold">Linhas rejeitadas</h2>

              <ul className="mt-3 space-y-1 text-sm">
                {preview.erros.map((item) => (
                  <li key={`${item.linha}-${item.motivo}`}>
                    Linha {item.linha}: {item.motivo}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  );
}
