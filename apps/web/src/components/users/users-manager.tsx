"use client";

import {
  Check,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { UserActions } from "./user-actions";

type Profile = {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  sistema?: boolean;
};

type Person = {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  unidade?: string | null;
  cargo?: string | null;
  funcoes: Array<{ funcao: string }>;
};

type User = {
  id: string;
  nome: string;
  email: string;
  status: "ATIVO" | "INATIVO" | "BLOQUEADO";
  unidade?: string | null;
  trocarSenha: boolean;
  ultimoLoginEm?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  pessoaId?: string | null;
  pessoa?: {
    id: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    unidade?: string | null;
    cargo?: string | null;
  } | null;
  perfis: Array<{ perfil: Profile }>;
};

type FormState = {
  id?: string;
  nome: string;
  email: string;
  unidade: string;
  pessoaId: string;
  perfilIds: string[];
};

const emptyForm: FormState = {
  nome: "",
  email: "",
  unidade: "",
  pessoaId: "",
  perfilIds: [],
};

function errorMessage(data: unknown) {
  if (typeof data === "object" && data && "message" in data) {
    const message = (data as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(". ") : message;
  }
  return undefined;
}

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async (term = "") => {
    setLoading(true);
    const suffix = term ? `?search=${encodeURIComponent(term)}` : "";
    const response = await fetch(`/api/ferramentas/usuarios${suffix}`);
    const data = await response.json();
    if (response.ok) setUsers(data);
    else
      setError(errorMessage(data) ?? "Não foi possível carregar os usuários.");
    setLoading(false);
  }, []);

  const loadPeople = useCallback(async (userId?: string) => {
    const query = userId ? `?usuarioId=${encodeURIComponent(userId)}` : "";

    const response = await fetch(
      `/api/ferramentas/usuarios/pessoas-disponiveis${query}`,
      { cache: "no-store" },
    );

    const data = await response.json();

    if (response.ok) {
      setPeople(data);
    } else {
      setError(
        errorMessage(data) ??
          "Não foi possível carregar as pessoas disponíveis.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
      void fetch("/api/ferramentas/usuarios/perfis")
        .then(async (response) => ({ response, data: await response.json() }))
        .then(({ response, data }) => {
          if (response.ok) setProfiles(data);
          else
            setError(
              errorMessage(data) ?? "Não foi possível carregar os perfis.",
            );
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, loadUsers]);

  function openCreate() {
    setForm(emptyForm);
    void loadPeople();
    setError("");
    setModal(true);
  }

  function openEdit(user: User) {
    void loadPeople(user.id);
    setForm({
      id: user.id,
      nome: user.nome,
      email: user.email,
      unidade: user.unidade ?? "",
      pessoaId: user.pessoaId ?? "",
      perfilIds: user.perfis.map((item) => item.perfil.id),
    });
    setError("");
    setModal(true);
  }

  function toggleProfile(id: string) {
    setForm((current) => ({
      ...current,
      perfilIds: current.perfilIds.includes(id)
        ? current.perfilIds.filter((item) => item !== id)
        : [...current.perfilIds, id],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const editing = Boolean(form.id);
    const response = await fetch(
      editing
        ? `/api/ferramentas/usuarios/${form.id}`
        : "/api/ferramentas/usuarios",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          unidade: form.unidade || undefined,
          pessoaId: form.pessoaId || null,
          perfilIds: form.perfilIds,
        }),
      },
    );
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(errorMessage(data) ?? "Não foi possível salvar o usuário.");
      return;
    }

    await loadUsers(search);
    setModal(false);

    if (!editing) {
      window.alert(
        data.message ?? "Usuário criado e instruções enviadas por e-mail.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-600">Hub Ferramentas</p>
          <h2 className="mt-1 text-3xl font-bold">Usuários</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Cadastre usuários, associe perfis e acompanhe o acesso ao portal.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500"
        >
          <Plus size={19} /> Novo usuário
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Total"
          value={users.length}
          icon={<UserRound size={20} />}
        />
        <Metric
          label="Ativos"
          value={users.filter((u) => u.status === "ATIVO").length}
          icon={<Check size={20} />}
        />
        <Metric
          label="Troca de senha"
          value={users.filter((u) => u.trocarSenha).length}
          icon={<ShieldCheck size={20} />}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <label className="relative block max-w-xl">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por nome, e-mail ou unidade"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Perfis</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={() => openEdit(user)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
          {users.map((user) => (
            <UserCard key={user.id} user={user} onEdit={() => openEdit(user)} />
          ))}
        </div>

        {loading && (
          <p className="p-8 text-center text-sm text-slate-500">
            Carregando...
          </p>
        )}
        {!loading && users.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            Nenhum usuário encontrado.
          </p>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-600">
                  Ferramentas
                </p>
                <h3 className="text-2xl font-bold">
                  {form.id ? "Editar usuário" : "Novo usuário"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-900"
                aria-label="Fechar"
              >
                <X />
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <input
                    required
                    minLength={3}
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="input"
                  />
                </Field>
              </div>
              <Field label="Unidade">
                <input
                  value={form.unidade}
                  maxLength={10}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unidade: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="RJ ou SP"
                  className="input"
                />
              </Field>
              <Field label="Pessoa associada">
                <select
                  value={form.pessoaId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      pessoaId: event.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="">Nenhuma pessoa associada</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.nome}
                      {person.cargo ? ` · ${person.cargo}` : ""}
                      {person.unidade ? ` · ${person.unidade}` : ""}
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs text-slate-500">
                  Cada pessoa pode estar associada a apenas um usuário.
                </p>
              </Field>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  Perfis de acesso
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profiles.map((profile) => (
                    <label
                      key={profile.id}
                      className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${form.perfilIds.includes(profile.id) ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-slate-200 dark:border-slate-700"}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.perfilIds.includes(profile.id)}
                        onChange={() => toggleProfile(profile.id)}
                        className="mt-1 accent-red-600"
                      />
                      <span>
                        <span className="block font-semibold">
                          {profile.nome}
                        </span>
                        <span className="text-xs text-slate-500">
                          {profile.descricao ?? profile.codigo}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-red-600">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </article>
  );
}

function Status({ user }: { user: User }) {
  const color =
    user.status === "ATIVO"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : user.status === "BLOQUEADO"
        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {user.status}
    </span>
  );
}

function UserRow({ user, onEdit }: { user: User; onEdit: () => void }) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
      <td className="px-5 py-4">
        <p className="font-semibold">{user.nome}</p>
        <p className="text-xs text-slate-500">{user.email}</p>
        <p className="mt-1 text-xs font-medium text-red-600">
          {user.pessoa ? `Pessoa: ${user.pessoa.nome}` : "Sem pessoa associada"}
        </p>
      </td>

      <td className="px-5 py-4">{user.unidade ?? "Não definida"}</td>

      <td className="px-5 py-4">
        {user.perfis.map((item) => item.perfil.nome).join(", ") || "Sem perfil"}
      </td>

      <td className="px-5 py-4">
        <Status user={user} />
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <UserActions user={user} />

          <button
            type="button"
            onClick={onEdit}
            title="Editar"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
          >
            <Pencil size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function UserCard({ user, onEdit }: { user: User; onEdit: () => void }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{user.nome}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="mt-1 text-xs font-medium text-red-600">
            {user.pessoa
              ? `Pessoa: ${user.pessoa.nome}`
              : "Sem pessoa associada"}
          </p>
        </div>

        <Status user={user} />
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {user.unidade ?? "Unidade não definida"} ·{" "}
        {user.perfis.map((item) => item.perfil.nome).join(", ") || "Sem perfil"}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
        >
          <Pencil size={16} />
          Editar
        </button>

        <UserActions user={user} />
      </div>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
