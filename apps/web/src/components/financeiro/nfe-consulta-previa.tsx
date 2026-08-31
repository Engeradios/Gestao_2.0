"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Filial = {
  id: string;
  codigo: string;
  nome: string;
  cnpj?: string | null;
  ativo: boolean;
};
type ImportResult = {
  sucesso: boolean;
  notaId: string;
  numero?: string | null;
  situacao?: string | null;
  itens: number;
  parcelas: number;
  mensagem: string;
};
type Preview = {
  ambiente: string;
  jaImportada: boolean;
  cStat?: string;
  xMotivo?: string;
  documentoDisponivel?: boolean;
  aviso?: string;
  notaExistente?: {
    id: string;
    numero?: string | null;
    filialId?: string | null;
  };
  previa?: {
    chave?: string;
    chaveFinal?: string;
    schema?: string | null;
    numero?: string | null;
    serie?: string | null;
    emissao?: string | null;
    emitenteCnpj?: string | null;
    emitenteNome?: string | null;
    valorTotal?: string | null;
    protocolo?: string | null;
    situacao?: string | null;
  };
};

function digits(value: string) {
  return value.replace(/\D/g, "").slice(0, 44);
}
function formatCnpj(value?: string | null) {
  const v = (value ?? "").replace(/\D/g, "");
  return v.length === 14
    ? v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : (value ?? "");
}
function money(value?: string | null) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "Não informado";
}
function errorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export function NfeConsultaPrevia() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialId, setFilialId] = useState("");
  const [chave, setChave] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingFiliais, setLoadingFiliais] = useState(true);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Preview | null>(null);
  const [importando, setImportando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [importado, setImportado] = useState<ImportResult | null>(null);
  const chaveValida = useMemo(() => chave.length === 44, [chave]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/financeiro/filiais", {
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(
            errorMessage(body, "Não foi possível carregar as filiais."),
          );
        const source = Array.isArray(body)
          ? body
          : body && typeof body === "object" && "itens" in body
            ? (body as { itens?: unknown }).itens
            : [];
        const list = Array.isArray(source)
          ? (source as Filial[]).filter((item) => item.ativo && item.cnpj)
          : [];
        setFiliais(list);
        if (list.length === 1) setFilialId(list[0].id);
      } catch (error) {
        if (!controller.signal.aborted)
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as filiais.",
          );
      } finally {
        if (!controller.signal.aborted) setLoadingFiliais(false);
      }
    })();
    return () => controller.abort();
  }, []);

  async function consultar(event: FormEvent) {
    event.preventDefault();
    setErro("");
    setResultado(null);
    if (!filialId) {
      setErro("Selecione a filial destinatária da NF-e.");
      return;
    }
    if (!chaveValida) {
      setErro("Informe os 44 dígitos da chave de acesso.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/financeiro/notas-recebidas/consulta-chave/${filialId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chave }),
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          errorMessage(
            body,
            `A consulta não pôde ser concluída (HTTP ${response.status}).`,
          ),
        );
      setResultado(body as Preview);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar a NF-e.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function importarConfirmado() {
    if (!filialId || !chaveValida || !resultado?.documentoDisponivel) return;
    setImportando(true);
    setErro("");
    setImportado(null);
    try {
      const response = await fetch(
        `/api/financeiro/notas-recebidas/importar-chave/${filialId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chave }),
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          errorMessage(
            body,
            `A importação não pôde ser concluída (HTTP ${response.status}).`,
          ),
        );
      const data = body as ImportResult;
      setImportado(data);
      setResultado((atual) =>
        atual ? { ...atual, jaImportada: true } : atual,
      );
      setConfirmando(false);
      window.dispatchEvent(new Event("financeiro:notas-recebidas:refresh"));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível importar a NF-e.",
      );
    } finally {
      setImportando(false);
    }
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      aria-labelledby="consulta-nfe-title"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="consulta-nfe-title"
            className="text-lg font-semibold text-slate-950 dark:text-white"
          >
            Consultar NF-e recebida
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Consulte uma chave no Ambiente Nacional. Nenhum documento será
            importado nesta etapa.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Produção · somente consulta
        </span>
      </div>
      <form
        onSubmit={consultar}
        className="grid gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(340px,1.4fr)_auto] lg:items-end"
      >
        <label className="grid gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
          Filial destinatária *
          <select
            value={filialId}
            disabled={loadingFiliais || loading}
            onChange={(event) => setFilialId(event.target.value)}
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-950"
            required
          >
            <option value="">
              {loadingFiliais ? "Carregando filiais..." : "Selecione"}
            </option>
            {filiais.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.nome} · {formatCnpj(filial.cnpj)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
          Chave de acesso (44 dígitos) *
          <input
            value={chave}
            onChange={(event) => setChave(digits(event.target.value))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Digite ou cole a chave"
            maxLength={44}
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm tracking-wide dark:border-slate-600 dark:bg-slate-950"
            aria-describedby="chave-ajuda"
            required
          />
          <span id="chave-ajuda" className="text-xs font-normal text-slate-500">
            {chave.length}/44 dígitos
          </span>
        </label>
        <button
          type="submit"
          disabled={loading || loadingFiliais || !filialId || !chaveValida}
          className="h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Consultando..." : "Consultar NF-e"}
        </button>
      </form>
      {erro ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {erro}
        </div>
      ) : null}
      {resultado ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-950 dark:text-white">
              Resultado da consulta
            </h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${resultado.jaImportada ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}
            >
              {resultado.jaImportada
                ? "Já importada"
                : `cStat ${resultado.cStat ?? "não informado"}`}
            </span>
          </div>
          {resultado.jaImportada ? (
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
              Esta chave já está cadastrada
              {resultado.notaExistente?.numero
                ? ` como nota ${resultado.notaExistente.numero}`
                : ""}
              .
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {resultado.xMotivo ?? resultado.aviso}
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Emitente</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {resultado.previa?.emitenteNome ?? "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Número / série</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {resultado.previa?.numero ?? "—"} /{" "}
                    {resultado.previa?.serie ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Emissão</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {resultado.previa?.emissao ?? "Não informada"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Valor</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {money(resultado.previa?.valorTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Protocolo</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {resultado.previa?.protocolo ?? "Não disponível"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Documento</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {resultado.documentoDisponivel
                      ? "XML disponível na consulta"
                      : "Resumo ou situação disponível"}
                  </dd>
                </div>
              </dl>
              {importado ? (
                <div
                  role="status"
                  className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                >
                  <p className="font-semibold">{importado.mensagem}</p>
                  <p className="mt-1">
                    Nota {importado.numero ?? importado.notaId} ·{" "}
                    {importado.itens} item(ns) · {importado.parcelas}{" "}
                    parcela(s).
                  </p>
                </div>
              ) : resultado.documentoDisponivel ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    A confirmação reconsultará a SEFAZ e armazenará o XML, itens
                    e parcelas como pendentes de conferência. Nenhum título será
                    criado automaticamente.
                  </p>
                  {confirmando ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={importando}
                        onClick={() => void importarConfirmado()}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {importando ? "Importando..." : "Confirmar importação"}
                      </button>
                      <button
                        type="button"
                        disabled={importando}
                        onClick={() => setConfirmando(false)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmando(true)}
                      className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Importar para o repositório
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  Somente o resumo está disponível. A importação exige o XML
                  completo.
                </p>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
