"use client";
import { useCallback, useEffect, useState } from "react";
type Client = {
  id: string;
  codigo?: number | null;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
  contatoNome?: string | null;
  contatoEmail?: string | null;
  contatoFone?: string | null;
  website?: string | null;
  ativo: boolean;
};
type Page = {
  itens: Client[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
};
type Form = Omit<Client, "id">;
const empty: Form = { razaoSocial: "", ativo: true };
function message(v: unknown) {
  if (!v || typeof v !== "object") return "Não foi possível concluir.";
  const m = (v as { message?: string | string[] }).message;
  return Array.isArray(m) ? m.join(" ") : m || "Não foi possível concluir.";
}
async function api(path: string, init?: RequestInit) {
  const r = await fetch(`/api/operacional/${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(message(d));
  return d;
}
export function ClientsManager({ canManage }: { canManage: boolean }) {
  const [data, setData] = useState<Page>({
    itens: [],
    total: 0,
    pagina: 1,
    porPagina: 25,
    totalPaginas: 0,
  });
  const [q, setQ] = useState("");
  const [uf, setUf] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Client | null | undefined>();
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    const p = new URLSearchParams({ pagina: String(page), porPagina: "25" });
    if (q.trim()) p.set("q", q.trim());
    if (uf.trim()) p.set("uf", uf.trim().toUpperCase());
    try {
      setData(await api(`clientes?${p}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    }
  }, [page, q, uf]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const set = (k: keyof Form, v: string | number | boolean | undefined) =>
    setForm((x) => ({ ...x, [k]: v }));
  function open(c?: Client) {
    setEditing(c ?? null);
    setForm(c ? { ...c } : empty);
    setError("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        uf: form.uf?.toUpperCase() || undefined,
        codigo: form.codigo || undefined,
      };
      await api(editing?.id ? `clientes/${editing.id}` : "clientes", {
        method: editing?.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setEditing(undefined);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(c: Client) {
    if (!confirm(`Confirma a exclusão de ${c.razaoSocial}?`)) return;
    try {
      await api(`clientes/${c.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir.");
    }
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
            Operacional
          </p>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-sm text-slate-500">
            Cadastro e consulta de clientes operacionais.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => open()}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
          >
            Novo cliente
          </button>
        )}
      </header>
      <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_120px_auto] dark:border-slate-800 dark:bg-slate-950">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por cliente, CNPJ, município ou contato"
          className="rounded-xl border bg-transparent px-3 py-2 dark:border-slate-700"
        />
        <input
          value={uf}
          maxLength={2}
          onChange={(e) => {
            setUf(e.target.value);
            setPage(1);
          }}
          placeholder="UF"
          className="rounded-xl border bg-transparent px-3 py-2 uppercase dark:border-slate-700"
        />
        <button
          onClick={() => void load()}
          className="rounded-xl border px-4 py-2"
        >
          Atualizar
        </button>
      </section>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Município/UF</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {data.itens.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">{c.codigo ?? "—"}</td>
                <td className="px-4 py-3">
                  <b>{c.razaoSocial}</b>
                  <div className="text-xs text-slate-500">
                    {c.nomeFantasia || "—"}
                  </div>
                </td>
                <td className="px-4 py-3">{c.cnpj || "—"}</td>
                <td className="px-4 py-3">
                  {[c.municipio, c.uf].filter(Boolean).join("/") || "—"}
                </td>
                <td className="px-4 py-3">
                  {c.contatoNome || "—"}
                  <div className="text-xs text-slate-500">
                    {c.contatoEmail || c.contatoFone || ""}
                  </div>
                </td>
                <td className="px-4 py-3">{c.ativo ? "Ativo" : "Inativo"}</td>
                {canManage && (
                  <td className="space-x-3 whitespace-nowrap px-4 py-3">
                    <button onClick={() => open(c)} className="text-blue-600">
                      Editar
                    </button>
                    <button
                      onClick={() => void remove(c)}
                      className="text-red-600"
                    >
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!data.itens.length && (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="p-8 text-center text-slate-500"
                >
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between text-sm">
        <span>{data.total} cliente(s)</span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((x) => x - 1)}
            className="rounded-lg border px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            {page} de {Math.max(data.totalPaginas, 1)}
          </span>
          <button
            disabled={page >= data.totalPaginas}
            onClick={() => setPage((x) => x + 1)}
            className="rounded-lg border px-3 py-1 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </footer>
      {editing !== undefined && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-950"
          >
            <div className="mb-5 flex justify-between">
              <h3 className="text-xl font-bold">
                {editing ? "Editar cliente" : "Novo cliente"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(undefined)}
                className="rounded-lg border px-3 py-1"
              >
                Fechar
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Código"
                type="number"
                value={form.codigo}
                change={(v) => set("codigo", v ? Number(v) : undefined)}
              />
              <Field
                label="Razão social"
                required
                value={form.razaoSocial}
                change={(v) => set("razaoSocial", v)}
              />
              <Field
                label="Nome fantasia"
                value={form.nomeFantasia}
                change={(v) => set("nomeFantasia", v)}
              />
              <Field
                label="CNPJ"
                value={form.cnpj}
                change={(v) => set("cnpj", v)}
              />
              <Field
                label="Endereço"
                value={form.endereco}
                change={(v) => set("endereco", v)}
              />
              <Field
                label="Bairro"
                value={form.bairro}
                change={(v) => set("bairro", v)}
              />
              <Field
                label="Município"
                value={form.municipio}
                change={(v) => set("municipio", v)}
              />
              <Field
                label="UF"
                maxLength={2}
                value={form.uf}
                change={(v) => set("uf", v)}
              />
              <Field
                label="CEP"
                value={form.cep}
                change={(v) => set("cep", v)}
              />
              <Field
                label="Contato"
                value={form.contatoNome}
                change={(v) => set("contatoNome", v)}
              />
              <Field
                label="E-mail"
                type="email"
                value={form.contatoEmail}
                change={(v) => set("contatoEmail", v)}
              />
              <Field
                label="Telefone"
                value={form.contatoFone}
                change={(v) => set("contatoFone", v)}
              />
              <Field
                label="Website com protocolo"
                type="url"
                value={form.website}
                change={(v) => set("website", v)}
              />
              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => set("ativo", e.target.checked)}
                />
                Ativo
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(undefined)}
                className="rounded-xl border px-4 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
function Field({
  label,
  value,
  change,
  type = "text",
  required = false,
  maxLength,
}: {
  label: string;
  value?: string | number | null;
  change: (v: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        required={required}
        type={type}
        maxLength={maxLength}
        value={value ?? ""}
        onChange={(e) => change(e.target.value)}
        className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 dark:border-slate-700"
      />
    </label>
  );
}
