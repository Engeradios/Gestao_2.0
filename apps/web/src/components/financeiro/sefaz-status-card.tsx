"use client";

import { useState } from "react";

type SefazStatus = {
  ambiente: string;
  cStat: string | null;
  xMotivo: string | null;
  tempoMs: number;
  consultadoEm: string;
};

export function SefazStatusCard({ filialId }: { filialId: string | number }) {
  const [status, setStatus] = useState<SefazStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function consultar() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/financeiro/filiais/${filialId}/sefaz/status`,
        {
          cache: "no-store",
          credentials: "same-origin",
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          body &&
          typeof body === "object" &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : "Não foi possível consultar a SEFAZ.";
        throw new Error(message);
      }
      setStatus(body as SefazStatus);
    } catch (cause) {
      setStatus(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha inesperada na consulta.",
      );
    } finally {
      setLoading(false);
    }
  }

  const operational = status?.cStat === "107";
  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">SEFAZ NF-e</h3>
          <p className="text-xs text-muted-foreground">
            Ambiente de homologação
          </p>
        </div>
        <button
          type="button"
          onClick={consultar}
          disabled={loading}
          className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Consultando..." : "Consultar status"}
        </button>
      </div>
      {status && (
        <div className="mt-3 grid gap-1 text-sm">
          <p className={operational ? "text-emerald-600" : "text-amber-600"}>
            {operational
              ? "Serviço em operação"
              : (status.xMotivo ?? "Status indisponível")}
          </p>
          <p className="text-xs text-muted-foreground">
            cStat {status.cStat ?? "N/D"} · {status.tempoMs} ms ·{" "}
            {new Date(status.consultadoEm).toLocaleString("pt-BR")}
          </p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}
