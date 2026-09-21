"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type FunctionItem = {
  funcao: string;
  ativo: boolean;
};

type Person = {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  unidade?: string | null;
  cargo?: string | null;
  cnh?: string | null;
  vencimentoCnh?: string | null;
  ativo: boolean;
  funcoes: FunctionItem[];
};

type PageData = {
  items: Person[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type FormState = {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  unidade: string;
  cargo: string;
  cnh: string;
  vencimentoCnh: string;
  ativo: boolean;
  funcoes: string[];
};

const functions = [
  "TECNICO",
  "MOTORISTA",
  "ENTREGADOR",
  "VENDEDOR",
  "SUPERVISOR",
  "GERENTE",
  "ADMINISTRATIVO",
];

const emptyForm: FormState = {
  nome: "",
  email: "",
  telefone: "",
  unidade: "",
  cargo: "",
  cnh: "",
  vencimentoCnh: "",
  ativo: true,
  funcoes: [],
};

function message(data: unknown) {
  if (data && typeof data === "object" && "message" in data) {
    const value = (data as { message?: string | string[] }).message;
    return Array.isArray(value) ? value.join(". ") : value;
  }

  return undefined;
}

export function PeopleManager({
  canManage,
  fixedFunction,
  title = "Pessoas",
}: {
  canManage: boolean;
  fixedFunction?: string;
  title?: string;
}) {
  const [data, setData] = useState<PageData>({
    items: [],
    pagination: { page: 1, limit: 25, total: 0, pages: 0 },
  });
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("true");
  const [functionFilter, setFunctionFilter] = useState(fixedFunction ?? "");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    const query = new URLSearchParams({
      page: String(page),
      limit: "25",
    });

    if (search.trim()) query.set("busca", search.trim());
    if (active) query.set("ativo", active);
    if (functionFilter) query.set("funcao", functionFilter);

    const response = await fetch(
      `/api/ferramentas/cadastros/pessoas?${query}`,
      { cache: "no-store" },
    );

    const body = await response.json();

    if (response.ok) setData(body);
    else setNotice(message(body) ?? "Não foi possível carregar.");

    setLoading(false);
  }, [active, functionFilter, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  function create() {
    setForm({
      ...emptyForm,
      funcoes: fixedFunction ? [fixedFunction] : [],
    });
    setNotice("");
    setModal(true);
  }

  function edit(person: Person) {
    setForm({
      id: person.id,
      nome: person.nome,
      email: person.email ?? "",
      telefone: person.telefone ?? "",
      unidade: person.unidade ?? "",
      cargo: person.cargo ?? "",
      cnh: person.cnh ?? "",
      vencimentoCnh: person.vencimentoCnh?.slice(0, 10) ?? "",
      ativo: person.ativo,
      funcoes: person.funcoes
        .filter((item) => item.ativo)
        .map((item) => item.funcao),
    });
    setNotice("");
    setModal(true);
  }

  function toggleFunction(value: string) {
    setForm((current) => ({
      ...current,
      funcoes: current.funcoes.includes(value)
        ? current.funcoes.filter((item) => item !== value)
        : [...current.funcoes, value],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice("");

    const response = await fetch(
      form.id
        ? `/api/ferramentas/cadastros/pessoas/${form.id}`
        : "/api/ferramentas/cadastros/pessoas",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email || undefined,
          telefone: form.telefone || undefined,
          unidade: form.unidade || undefined,
          cargo: form.cargo || undefined,
          cnh: form.cnh || undefined,
          vencimentoCnh: form.vencimentoCnh || undefined,
          ativo: form.ativo,
          funcoes: form.funcoes,
        }),
      },
    );

    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setNotice(message(body) ?? "Não foi possível salvar.");
      return;
    }

    setModal(false);
    setNotice("Cadastro salvo com sucesso.");
    await load();
  }

  async function toggleStatus(person: Person) {
    const response = await fetch(
      `/api/ferramentas/cadastros/pessoas/${person.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !person.ativo }),
      },
    );

    const body = await response.json();

    if (!response.ok) {
      setNotice(message(body) ?? "Não foi possível alterar o status.");
      return;
    }

    setNotice("Status atualizado.");
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Ferramentas · Cadastros
          </p>
          <h1 className="mt-1 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Cadastro central utilizado pelos módulos operacionais.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={create}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500"
          >
            <Plus size={18} />
            Nova pessoa
          </button>
        )}
      </header>

      <p aria-live="polite" className="text-sm text-amber-700">
        {notice}
      </p>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_220px_160px] dark:bg-slate-950">
        <label className="relative">
          <span className="sr-only">Pesquisar pessoas</span>
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Nome, e-mail, telefone, cargo ou CNH"
            className="w-full rounded-xl border bg-transparent py-3 pl-10 pr-3"
          />
        </label>

        {!fixedFunction && (
          <select
            value={functionFilter}
            onChange={(event) => {
              setFunctionFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por função"
            className="rounded-xl border bg-transparent px-3"
          >
            <option value="">Todas as funções</option>
            {functions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        )}

        <select
          value={active}
          onChange={(event) => {
            setActive(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por situação"
          className="rounded-xl border bg-transparent px-3"
        >
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3">Pessoa</th>
                <th className="px-5 py-3">Cargo / Unidade</th>
                <th className="px-5 py-3">Funções</th>
                <th className="px-5 py-3">Situação</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y dark:divide-slate-800">
              {data.items.map((person) => (
                <tr key={person.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
                        <UserRound size={19} />
                      </span>
                      <div>
                        <strong>{person.nome}</strong>
                        <p className="text-xs text-slate-500">
                          {person.email || person.telefone || "Sem contato"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {person.cargo || "Não informado"}
                    <p className="text-xs text-slate-500">
                      {person.unidade || "Sem unidade"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {person.funcoes
                        .filter((item) => item.ativo)
                        .map((item) => (
                          <span
                            key={item.funcao}
                            className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                          >
                            {item.funcao}
                          </span>
                        ))}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {person.ativo ? "Ativo" : "Inativo"}
                  </td>

                  <td className="px-5 py-4 text-right">
                    {canManage && (
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => edit(person)}
                          aria-label={`Editar ${person.nome}`}
                          className="rounded-lg border p-2"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(person)}
                          className="rounded-lg border px-3 py-2 text-xs font-semibold"
                        >
                          {person.ativo ? "Inativar" : "Ativar"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <p className="p-8 text-center text-sm text-slate-500">
            Carregando...
          </p>
        )}

        {!loading && data.items.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            Nenhum cadastro encontrado.
          </p>
        )}

        <footer className="flex items-center justify-between border-t p-4 dark:border-slate-800">
          <span className="text-sm text-slate-500">
            {data.pagination.total} registro(s)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft size={17} />
            </button>

            <span className="text-sm">
              {page} de {Math.max(1, data.pagination.pages)}
            </span>

            <button
              type="button"
              disabled={page >= data.pagination.pages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
              aria-label="Próxima página"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-dialog-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950"
          >
            <header className="flex justify-between">
              <h2 id="person-dialog-title" className="text-2xl font-bold">
                {form.id ? "Editar pessoa" : "Nova pessoa"}
              </h2>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Fechar"
              >
                <X />
              </button>
            </header>

            <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["nome", "Nome", "text"],
                ["email", "E-mail", "email"],
                ["telefone", "Telefone", "text"],
                ["unidade", "Unidade", "text"],
                ["cargo", "Cargo", "text"],
                ["cnh", "CNH", "text"],
                ["vencimentoCnh", "Vencimento da CNH", "date"],
              ].map(([field, label, type]) => (
                <label key={field} className="text-sm">
                  {label}
                  <input
                    required={field === "nome"}
                    type={type}
                    value={String(form[field as keyof FormState] ?? "")}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
                  />
                </label>
              ))}

              <fieldset className="md:col-span-2">
                <legend className="mb-2 text-sm font-semibold">Funções</legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {functions.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 rounded-xl border p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.funcoes.includes(item)}
                        onChange={() => toggleFunction(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded-xl border px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
