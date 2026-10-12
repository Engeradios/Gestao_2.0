"use client";

import { useCallback, useEffect, useState } from "react";

import {
  GpGovernanceApiError,
  gpGovernanceApi,
} from "./gp-governanca-api";

import type {
  GpGovernancePermissions,
  GpPage,
  GpRisk,
  GpTeamMember,
  GpVisit,
} from "./gp-governanca-types";

export type GovernanceSection =
  | "visitas"
  | "equipe"
  | "riscos";

type Data = GpPage<
  GpVisit | GpTeamMember | GpRisk
>;

type Props = {
  projectId: number;
  permissions: GpGovernancePermissions;
  section: GovernanceSection;
};

const LIMIT = 25;

function errorMessage(error: unknown) {
  if (
    error instanceof GpGovernanceApiError ||
    error instanceof Error
  ) {
    return error.message;
  }

  return "Falha inesperada.";
}

function Pager({
  page,
  pages,
  busy,
  setPage,
}: {
  page: number;
  pages: number;
  busy: boolean;
  setPage: (page: number) => void;
}) {
  if (pages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-between pt-4">
      <button
        type="button"
        disabled={busy || page <= 1}
        onClick={() => setPage(page - 1)}
        className="rounded border px-3 py-2 disabled:opacity-50"
      >
        Anterior
      </button>

      <span className="text-sm">
        Página {page} de {pages}
      </span>

      <button
        type="button"
        disabled={busy || page >= pages}
        onClick={() => setPage(page + 1)}
        className="rounded border px-3 py-2 disabled:opacity-50"
      >
        Próxima
      </button>
    </div>
  );
}

function List({
  section,
  data,
}: {
  section: GovernanceSection;
  data: Data;
}) {
  if (!data.itens.length) {
    return (
      <div className="rounded border border-dashed p-6 text-center">
        Nenhum registro localizado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.itens.map((item) => (
        <article
          key={String(item.id)}
          className="rounded border bg-white p-4 dark:bg-slate-950"
        >
          <strong>
            {section === "visitas"
              ? (item as GpVisit).tecnico || "Visita técnica"
              : section === "equipe"
                ? (item as GpTeamMember).nome
                : (item as GpRisk).titulo}
          </strong>

          <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(item, null, 2)}
          </pre>
        </article>
      ))}
    </div>
  );
}

export function GpGovernancePanel({
  projectId,
  permissions,
  section,
}: Props) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allowed =
    section === "visitas"
      ? permissions.canViewVisits
      : section === "equipe"
        ? permissions.canViewTeam
        : permissions.canViewRisks;

  useEffect(() => {
    setPage(1);
  }, [section, projectId]);

  const load = useCallback(async () => {
    if (!allowed) {
      setData(null);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result =
        section === "visitas"
          ? await gpGovernanceApi.listVisits(
              projectId,
              page,
              LIMIT,
            )
          : section === "equipe"
            ? await gpGovernanceApi.listTeam(
                projectId,
                page,
                LIMIT,
              )
            : await gpGovernanceApi.listRisks(
                projectId,
                page,
                LIMIT,
              );

      setData(result);
    } catch (loadError) {
      setData(null);
      setError(errorMessage(loadError));
    } finally {
      setBusy(false);
    }
  }, [allowed, page, projectId, section]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!allowed) {
    return (
      <section className="rounded border p-4">
        Perfil sem permissão para consultar esta seção.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {busy && (
        <div
          aria-busy="true"
          className="rounded border p-6 text-center"
        >
          Carregando...
        </div>
      )}

      {!busy && error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded border px-3 py-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!busy && !error && data && (
        <>
          <List section={section} data={data} />

          <Pager
            page={data.paginacao.pagina}
            pages={data.paginacao.paginas}
            busy={busy}
            setPage={setPage}
          />
        </>
      )}

      <p className="text-xs text-slate-500">
        Operações de escrita permanecem bloqueadas até a
        integração e validação TypeScript.
      </p>
    </section>
  );
}
