"use client";

import { SefazStatusCard } from "@/components/financeiro/sefaz-status-card";
import { useCallback, useEffect, useRef, useState } from "react";

type Filial = {
  id: string;
  codigo: string;
  nome: string;
  cnpj?: string | null;
};
type CertificateStatus = {
  situacao: "NAO_CONFIGURADO" | "VALIDO" | "EXPIRADO" | "INVALIDO";
  instalado: boolean;
  validoAte?: string;
  validoDesde?: string;
  emissor?: string;
  titular?: string;
  serial?: string;
  sha256?: string;
  arquivoBytes?: number;
  mensagem?: string;
};

const labels: Record<CertificateStatus["situacao"], string> = {
  NAO_CONFIGURADO: "Não configurado",
  VALIDO: "Válido",
  EXPIRADO: "Expirado",
  INVALIDO: "Inválido",
};
const tones: Record<CertificateStatus["situacao"], string> = {
  NAO_CONFIGURADO:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  VALIDO:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  EXPIRADO: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  INVALIDO: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

async function readError(response: Response) {
  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === "object" && "message" in data) {
    const value = (data as { message?: unknown }).message;
    if (Array.isArray(value)) return value.join(" ");
    if (typeof value === "string") return value;
  }
  return "Não foi possível concluir a operação.";
}

export function FiliaisCertificadosPanel() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialId, setFilialId] = useState("");
  const [status, setStatus] = useState<CertificateStatus | null>(null);
  const [senha, setSenha] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadStatus = useCallback(async (id: string, signal?: AbortSignal) => {
    const response = await fetch(`/api/financeiro/filiais/${id}/certificado`, {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await readError(response));
    return response.json() as Promise<CertificateStatus>;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/financeiro/filiais", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response));
        return response.json() as Promise<Filial[]>;
      })
      .then((rows) => {
        setFiliais(rows);
        if (rows.length > 0) setFilialId((current) => current || rows[0].id);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== "AbortError")
          setErro(cause.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!filialId) return;
    const controller = new AbortController();
    async function refreshStatus() {
      try {
        const nextStatus = await loadStatus(filialId, controller.signal);
        setStatus(nextStatus);
      } catch (cause: unknown) {
        if (cause instanceof Error && cause.name !== "AbortError")
          setErro(cause.message);
      }
    }
    void refreshStatus();
    return () => controller.abort();
  }, [filialId, loadStatus]);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    const filial = filiais.find((item) => item.id === filialId);
    if (!filialId) {
      setErro("Selecione uma filial.");
      return;
    }
    if (!filial?.cnpj) {
      setErro("Cadastre o CNPJ da filial antes do certificado.");
      return;
    }
    if (!arquivo) {
      setErro("Selecione um arquivo .pfx ou .p12.");
      return;
    }
    if (!/\.(pfx|p12)$/i.test(arquivo.name)) {
      setErro("O arquivo deve possuir extensão .pfx ou .p12.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      setErro("O certificado deve ter no máximo 5 MB.");
      return;
    }
    if (!senha) {
      setErro("Informe a senha do certificado.");
      return;
    }

    const body = new FormData();
    body.append("arquivo", arquivo);
    body.append("senha", senha);
    setOcupado(true);
    try {
      const response = await fetch(
        `/api/financeiro/filiais/${filialId}/certificado`,
        {
          method: "POST",
          body,
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      setStatus((await response.json()) as CertificateStatus);
      setSenha("");
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      setMensagem("Certificado validado e instalado com segurança.");
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : "Falha ao instalar certificado.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function remover() {
    if (
      !filialId ||
      !window.confirm(
        "Remover o certificado desta filial? A operação será auditada.",
      )
    )
      return;
    setErro("");
    setMensagem("");
    setOcupado(true);
    try {
      const response = await fetch(
        `/api/financeiro/filiais/${filialId}/certificado`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(await readError(response));
      setStatus({ situacao: "NAO_CONFIGURADO", instalado: false });
      setSenha("");
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      setMensagem("Certificado removido com sucesso.");
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : "Falha ao remover certificado.",
      );
    } finally {
      setOcupado(false);
    }
  }

  const selected = filiais.find((item) => item.id === filialId);
  return (
    <section className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950">
      <header>
        <h2 className="text-xl font-bold">Certificado digital A1</h2>
        <p className="mt-1 text-sm text-slate-500">
          Certificado utilizado somente para consultas fiscais autorizadas. A
          senha não é exibida novamente.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_2fr]">
        <label className="text-sm font-medium">
          Filial <span className="text-red-600">*</span>
          <select
            value={filialId}
            onChange={(event) => setFilialId(event.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-900"
          >
            <option value="">Selecione</option>
            {filiais.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} · {item.cnpj || "CNPJ não cadastrado"}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                {selected?.nome || "Selecione uma filial"}
              </p>
              <p className="text-xs text-slate-500">
                {selected?.cnpj || "Sem CNPJ"}
              </p>
            </div>
            <SefazStatusCard filialId={filialId} />
            {status && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[status.situacao]}`}
              >
                {labels[status.situacao]}
              </span>
            )}
          </div>
          {status?.instalado && (
            <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-slate-500">Válido até</dt>
                <dd>
                  {status.validoAte
                    ? new Date(status.validoAte).toLocaleDateString("pt-BR")
                    : "Não informado"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Tamanho</dt>
                <dd>
                  {status.arquivoBytes
                    ? `${Math.ceil(status.arquivoBytes / 1024)} KB`
                    : "Não informado"}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-slate-500">Titular</dt>
                <dd className="break-words">
                  {status.titular || "Não informado"}
                </dd>
              </div>
              {status.mensagem && (
                <div className="md:col-span-2 text-red-700 dark:text-red-300">
                  {status.mensagem}
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      <form onSubmit={enviar} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">
          Arquivo PFX/P12 <span className="text-red-600">*</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pfx,.p12,application/x-pkcs12"
            disabled={ocupado}
            onChange={(event) => setArquivo(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900"
          />
        </label>
        <label className="text-sm font-medium">
          Senha do certificado <span className="text-red-600">*</span>
          <input
            type="password"
            autoComplete="new-password"
            value={senha}
            disabled={ocupado}
            onChange={(event) => setSenha(event.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-900"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button
            disabled={ocupado || !selected?.cnpj}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ocupado
              ? "Processando..."
              : status?.instalado
                ? "Substituir certificado"
                : "Instalar certificado"}
          </button>
          {status?.instalado && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void remover()}
              className="rounded-xl border border-red-300 px-4 py-2 text-red-700 disabled:opacity-50 dark:text-red-300"
            >
              Remover
            </button>
          )}
          <span className="text-xs text-slate-500">
            Máximo 5 MB. O arquivo deve conter certificado e chave privada.
          </span>
        </div>
      </form>

      {erro && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {erro}
        </p>
      )}
      {mensagem && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {mensagem}
        </p>
      )}
    </section>
  );
}
