"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
type User = { id: string; nome: string; email: string };
type Row = {
  id: string;
  usuarioId: string;
  uf: string;
  praca?: string | null;
  areaResponsavel: string;
  recAbertura: boolean;
  recConclusao: boolean;
  recLogistica: boolean;
  ativo: boolean;
  usuario: User;
};
type Form = {
  usuarioId: string;
  uf: string;
  praca: string;
  areaResponsavel: string;
  recAbertura: boolean;
  recConclusao: boolean;
  recLogistica: boolean;
};
const initial: Form = {
  usuarioId: "",
  uf: "RJ",
  praca: "",
  areaResponsavel: "OPERACIONAL",
  recAbertura: true,
  recConclusao: true,
  recLogistica: false,
};
const ufs = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
function message(v: unknown) {
  if (v && typeof v === "object" && "message" in v) {
    const m = (v as { message?: string | string[] }).message;
    return Array.isArray(m) ? m.join(". ") : m || "Falha na operação.";
  }
  return "Falha na operação.";
}
async function api<T>(path: string, init?: RequestInit) {
  const r = await fetch(`/api/operacional/notificacoes-obra/${path}`, {
    cache: "no-store",
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...(init.headers || {}) }
      : init?.headers,
  });
  const d: unknown = await r.json().catch(() => null);
  if (!r.ok) throw new Error(message(d));
  return d as T;
}
export function NotificationResponsibilitiesManager() {
  const [rows, setRows] = useState<Row[]>([]),
    [users, setUsers] = useState<User[]>([]),
    [form, setForm] = useState<Form>(initial),
    [editing, setEditing] = useState<Row | null>(null),
    [open, setOpen] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r, u] = await Promise.all([
        api<Row[]>("responsabilidades"),
        api<User[]>("usuarios-elegiveis"),
      ]);
      setRows(r);
      setUsers(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  function start(row?: Row) {
    setEditing(row || null);
    setForm(
      row
        ? {
            usuarioId: row.usuarioId,
            uf: row.uf,
            praca: row.praca || "",
            areaResponsavel: row.areaResponsavel,
            recAbertura: row.recAbertura,
            recConclusao: row.recConclusao,
            recLogistica: row.recLogistica,
          }
        : initial,
    );
    setError("");
    setSuccess("");
    setOpen(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(
        editing ? `responsabilidades/${editing.id}` : "responsabilidades",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({ ...form, praca: form.praca || undefined }),
        },
      );
      setOpen(false);
      setSuccess(
        editing
          ? "Responsabilidade atualizada."
          : "Responsabilidade cadastrada.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }
  async function status(row: Row) {
    setError("");
    try {
      await api(`responsabilidades/${row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !row.ativo }),
      });
      setSuccess(
        row.ativo
          ? "Responsabilidade desativada."
          : "Responsabilidade reativada.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao alterar estado.");
    }
  }
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">Ferramentas</p>
          <h1 className="text-3xl font-bold">
            Responsáveis por notificações de obra
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Defina responsáveis por UF, praça, área e tipo de evento. O
            roteamento de e-mails ainda permanece inalterado.
          </p>
        </div>
        <button
          onClick={() => start()}
          className="rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white"
        >
          Nova responsabilidade
        </button>
      </header>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-emerald-700"
        >
          {success}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left dark:bg-slate-900">
              <tr>
                {[
                  "Usuário",
                  "UF",
                  "Praça",
                  "Área",
                  "Abertura",
                  "Conclusão",
                  "Logística",
                  "Estado",
                  "Ações",
                ].map((x) => (
                  <th key={x} className="px-4 py-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    Carregando...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-t dark:border-slate-800">
                    <td className="px-4 py-3">
                      <b>{r.usuario.nome}</b>
                      <div className="text-xs text-slate-500">
                        {r.usuario.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.uf}</td>
                    <td className="px-4 py-3">{r.praca || "Toda a UF"}</td>
                    <td className="px-4 py-3">{r.areaResponsavel}</td>
                    <td className="px-4 py-3">
                      {r.recAbertura ? "Sim" : "Não"}
                    </td>
                    <td className="px-4 py-3">
                      {r.recConclusao ? "Sim" : "Não"}
                    </td>
                    <td className="px-4 py-3">
                      {r.recLogistica ? "Sim" : "Não"}
                    </td>
                    <td className="px-4 py-3">
                      {r.ativo ? "Ativo" : "Inativo"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => start(r)}
                          className="rounded-lg border px-3 py-1.5"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void status(r)}
                          className="rounded-lg border px-3 py-1.5"
                        >
                          {r.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Nenhuma responsabilidade cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resp-title"
        >
          <form
            onSubmit={save}
            className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950"
          >
            <div className="flex justify-between">
              <div>
                <h2 id="resp-title" className="text-xl font-bold">
                  {editing
                    ? "Editar responsabilidade"
                    : "Nova responsabilidade"}
                </h2>
                <p className="text-sm text-slate-500">
                  Associação administrativa, ainda sem efeito no envio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                Fechar
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                Usuário
                <select
                  required
                  value={form.usuarioId}
                  onChange={(e) =>
                    setForm({ ...form, usuarioId: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-3"
                >
                  <option value="">Selecione</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} · {u.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                UF
                <select
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value })}
                  className="mt-1 w-full rounded-xl border bg-transparent p-3"
                >
                  {ufs.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Praça opcional
                <input
                  maxLength={160}
                  value={form.praca}
                  onChange={(e) => setForm({ ...form, praca: e.target.value })}
                  placeholder="Toda a UF quando vazio"
                  className="mt-1 w-full rounded-xl border bg-transparent p-3"
                />
              </label>
              <label>
                Área
                <select
                  value={form.areaResponsavel}
                  onChange={(e) =>
                    setForm({ ...form, areaResponsavel: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent p-3"
                >
                  {["OPERACIONAL", "LOGISTICA", "AMBAS"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <fieldset className="rounded-xl border p-3">
                <legend>Eventos</legend>
                {(
                  [
                    ["recAbertura", "Abertura"],
                    ["recConclusao", "Conclusão"],
                    ["recLogistica", "Logística"],
                  ] as const
                ).map(([k, l]) => (
                  <label key={k} className="mr-4 inline-flex gap-2">
                    <input
                      type="checkbox"
                      checked={form[k]}
                      onChange={(e) =>
                        setForm({ ...form, [k]: e.target.checked })
                      }
                    />
                    {l}
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border px-5 py-2.5"
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
      )}
    </section>
  );
}
