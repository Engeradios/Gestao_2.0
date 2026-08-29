"use client";

import { Bell, Loader2, Save, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Preference = {
  receberSolicitacoes: boolean;
  receberAberturaServico: boolean;
  receberConclusaoFaturamento: boolean;
  receberLogistica: boolean;
  receberNotificacoesSistema: boolean;
  areaServicos: string;
  ativo: boolean;
  atualizadoEm: string;
};

type UserItem = {
  id: string;
  nome: string;
  email: string;
  status: string;
  unidade?: string | null;
  preferenciaNotificacao?: Preference | null;
};

const defaultPreference: Preference = {
  receberSolicitacoes: false,
  receberAberturaServico: false,
  receberConclusaoFaturamento: false,
  receberLogistica: false,
  receberNotificacoesSistema: true,
  areaServicos: "OPERACIONAL",
  ativo: true,
  atualizadoEm: "",
};

function messageOf(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: string | string[] }).message;

    return Array.isArray(message) ? message.join(". ") : message;
  }

  return undefined;
}

export function AdminNotificationsManager({
  canManage,
}: {
  canManage: boolean;
}) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/ferramentas/notificacoes", {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(messageOf(data) ?? "Não foi possível carregar os usuários.");
      setLoading(false);
      return;
    }

    setUsers(Array.isArray(data) ? data : []);
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

    if (!term) return users;

    return users.filter((user) =>
      `${user.nome} ${user.email} ${user.unidade ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [search, users]);

  function preference(user: UserItem) {
    return {
      ...defaultPreference,
      ...(user.preferenciaNotificacao ?? {}),
    };
  }

  function change(
    userId: string,
    field: keyof Preference,
    value: string | boolean,
  ) {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              preferenciaNotificacao: {
                ...preference(user),
                [field]: value,
              },
            }
          : user,
      ),
    );
  }

  async function save(user: UserItem) {
    const payload = preference(user);

    setSavingId(user.id);
    setMessage("");
    setError("");

    const response = await fetch(`/api/ferramentas/notificacoes/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        areaServicos: payload.areaServicos,
        receberSolicitacoes: payload.receberSolicitacoes,
        receberAberturaServico: payload.receberAberturaServico,
        receberConclusaoFaturamento: payload.receberConclusaoFaturamento,
        receberLogistica: payload.receberLogistica,
        receberNotificacoesSistema: payload.receberNotificacoesSistema,
        ativo: payload.ativo,
      }),
    });

    const data = await response.json().catch(() => null);
    setSavingId("");

    if (!response.ok) {
      setError(messageOf(data) ?? "Não foi possível salvar as preferências.");
      return;
    }

    setMessage(`Preferências de ${user.nome} atualizadas.`);
    await load();
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
          Ferramentas
        </p>
        <h1 className="mt-1 text-3xl font-bold">Notificações</h1>
        <p className="mt-2 text-sm text-slate-500">
          Defina quais usuários recebem notificações por evento e área.
        </p>
      </header>

      <label className="flex max-w-xl items-center gap-3 rounded-xl border bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <Search size={18} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar usuário..."
          className="w-full bg-transparent outline-none"
        />
      </label>

      {message && (
        <p className="rounded-xl bg-emerald-100 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-red-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((user) => {
            const current = preference(user);

            return (
              <article
                key={user.id}
                className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-red-100 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">
                      <Bell size={20} />
                    </span>

                    <div>
                      <h2 className="font-bold">{user.nome}</h2>
                      <p className="text-sm text-slate-500">{user.email}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {user.status}
                        {user.unidade ? ` · ${user.unidade}` : ""}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={!canManage}
                      checked={current.ativo}
                      onChange={(event) =>
                        change(user.id, "ativo", event.target.checked)
                      }
                      className="h-5 w-5 accent-red-600"
                    />
                    Preferência ativa
                  </label>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <label className="text-sm">
                    Área dos serviços
                    <select
                      disabled={!canManage}
                      value={current.areaServicos}
                      onChange={(event) =>
                        change(user.id, "areaServicos", event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border bg-transparent p-3 dark:border-slate-700"
                    >
                      <option value="OPERACIONAL">Operacional</option>
                      <option value="LOGISTICA">Logística</option>
                      <option value="AMBAS">Ambas</option>
                    </select>
                  </label>

                  {[
                    ["receberAberturaServico", "Abertura de serviços"],
                    ["receberConclusaoFaturamento", "Conclusão e faturamento"],
                    ["receberLogistica", "Eventos de logística"],
                    ["receberSolicitacoes", "Solicitações internas"],
                    ["receberNotificacoesSistema", "Comunicados gerais"],
                  ].map(([field, label]) => (
                    <label
                      key={field}
                      className="flex items-center gap-3 rounded-xl border p-3 text-sm dark:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        disabled={!canManage}
                        checked={Boolean(current[field as keyof Preference])}
                        onChange={(event) =>
                          change(
                            user.id,
                            field as keyof Preference,
                            event.target.checked,
                          )
                        }
                        className="h-5 w-5 accent-red-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {canManage && (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      disabled={savingId === user.id}
                      onClick={() => void save(user)}
                      className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {savingId === user.id ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Save size={17} />
                      )}
                      Salvar
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
