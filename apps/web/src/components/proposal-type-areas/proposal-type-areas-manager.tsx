"use client";

import { CheckCircle2, Pencil, Search, Settings2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Area = "OPERACIONAL" | "LOGISTICA" | "AMBAS";

type ProposalType = {
  tipo: string;
  area: Area;
  prazoPadraoDiasUteis: number | null;
  ativo: boolean;
  atualizadoPor?: string | null;
  atualizadoEm: string;
  quantidade: number;
  aprovadas: number;
  configurado: boolean;
};

function messageOf(data: unknown) {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: string | string[] }).message;

    return Array.isArray(message) ? message.join(". ") : message;
  }

  return undefined;
}

export function ProposalTypeAreasManager({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<ProposalType[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProposalType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/ferramentas/tipos-proposta", {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(messageOf(data) ?? "Não foi possível carregar os tipos.");
      setLoading(false);
      return;
    }

    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) =>
      `${item.tipo} ${item.area}`.toLowerCase().includes(term),
    );
  }, [items, search]);

  const pending = items.filter((item) => !item.configurado).length;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-red-600">Ferramentas</p>

          <h1 className="text-2xl font-bold">Tipos de proposta</h1>

          <p className="mt-1 text-sm text-slate-500">
            Associação automática de área e prazo operacional.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs uppercase text-slate-500">Pendentes</p>
          <p className="text-2xl font-bold">{pending}</p>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar tipo ou área..."
          className="w-full bg-transparent outline-none"
        />
      </div>

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Área</th>
                <th className="px-5 py-4">Prazo</th>
                <th className="px-5 py-4">Propostas</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Ação</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.tipo}>
                    <td className="px-5 py-4 font-medium">{item.tipo}</td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {item.area}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {item.prazoPadraoDiasUteis
                        ? `${item.prazoPadraoDiasUteis} dias úteis`
                        : "Não definido"}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {item.quantidade} total · {item.aprovadas} aprovadas
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          item.configurado
                            ? "inline-flex items-center gap-1 text-emerald-600"
                            : "inline-flex items-center gap-1 text-amber-600"
                        }
                      >
                        {item.configurado ? (
                          <>
                            <CheckCircle2 size={16} />
                            Configurado
                          </>
                        ) : (
                          "Pendente"
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setEditing(item)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </section>
  );
}

function EditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: ProposalType;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [area, setArea] = useState<Area>(item.area);
  const [deadline, setDeadline] = useState(
    item.prazoPadraoDiasUteis?.toString() ?? "",
  );
  const [active, setActive] = useState(item.ativo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch(
      `/api/ferramentas/tipos-proposta/${encodeURIComponent(item.tipo)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          prazoPadraoDiasUteis: Number(deadline),
          ativo: active,
        }),
      },
    );

    const data = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(messageOf(data) ?? "Não foi possível salvar a configuração.");
      return;
    }

    await onSaved();
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40">
              <Settings2 size={21} />
            </span>
            <h2 className="text-xl font-bold">{item.tipo}</h2>
            <p className="text-sm text-slate-500">
              Defina o roteamento automático.
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block text-sm">
            Área responsável
            <select
              value={area}
              onChange={(event) => setArea(event.target.value as Area)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
            >
              <option value="OPERACIONAL">Operacional</option>
              <option value="LOGISTICA">Logística</option>
              <option value="AMBAS">Ambas</option>
            </select>
          </label>

          <label className="block text-sm">
            Prazo padrão em dias úteis
            <input
              type="number"
              min={1}
              max={365}
              required
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
            />
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            Associação ativa
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 dark:border-slate-700"
          >
            Cancelar
          </button>

          <button
            disabled={saving}
            className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
