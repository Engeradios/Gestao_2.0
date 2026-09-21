"use client";

import {
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Search,
  Shield,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Effect = "PERMITIR" | "NEGAR";
type Permission = {
  id: string;
  hub: string;
  modulo: string;
  acao: string;
  descricao?: string | null;
};
type Assigned = { permissaoId: string; efeito: Effect; permissao: Permission };
type Profile = {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  sistema: boolean;
  permissoes: Assigned[];
  _count?: { usuarios: number };
};
type Assignment = Record<string, Effect | undefined>;

function messageOf(data: unknown) {
  if (typeof data === "object" && data && "message" in data) {
    const value = (data as { message?: string | string[] }).message;
    return Array.isArray(value)
      ? value.join(". ")
      : (value ?? "Erro inesperado");
  }
  return "Erro inesperado";
}

export function ProfilesManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [profilesResponse, permissionsResponse] = await Promise.all([
      fetch("/api/ferramentas/perfis", { cache: "no-store" }),
      fetch("/api/ferramentas/perfis/permissoes", { cache: "no-store" }),
    ]);
    if (!profilesResponse.ok || !permissionsResponse.ok) {
      setError(messageOf(await profilesResponse.json().catch(() => null)));
      setLoading(false);
      return;
    }
    setProfiles(await profilesResponse.json());
    setPermissions(await permissionsResponse.json());
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
    return !term
      ? profiles
      : profiles.filter((profile) =>
          `${profile.codigo} ${profile.nome} ${profile.descricao ?? ""}`
            .toLowerCase()
            .includes(term),
        );
  }, [profiles, search]);

  function edit(profile?: Profile) {
    setEditing(profile ?? null);
    setOpen(true);
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-red-600">Ferramentas</p>
          <h2 className="text-2xl font-bold">Perfis e permissões</h2>
          <p className="mt-1 text-sm text-slate-500">
            Controle de acesso por HUB, módulo e ação.
          </p>
        </div>
        <button
          onClick={() => edit()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500"
        >
          <Plus size={18} />
          Novo perfil
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar perfil..."
          className="w-full bg-transparent outline-none"
        />
      </div>
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          filtered.map((profile) => (
            <article
              key={profile.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50">
                  <Shield size={21} />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${profile.ativo ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}
                >
                  {profile.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{profile.nome}</h3>
              <p className="text-xs text-slate-500">{profile.codigo}</p>
              <p className="mt-3 min-h-10 text-sm text-slate-500">
                {profile.descricao || "Sem descrição"}
              </p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{profile.permissoes.length} permissões</span>
                <span>{profile._count?.usuarios ?? 0} usuários</span>
              </div>
              <button
                onClick={() => edit(profile)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
              >
                <Pencil size={16} />
                Editar
              </button>
            </article>
          ))
        )}
      </div>
      {open && (
        <ProfileDialog
          profile={editing}
          permissions={permissions}
          saving={saving}
          onClose={() => setOpen(false)}
          onSave={async (payload) => {
            setSaving(true);
            setError("");
            const response = await fetch(
              editing
                ? `/api/ferramentas/perfis/${editing.id}`
                : "/api/ferramentas/perfis",
              {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
            );
            const data = await response.json();
            setSaving(false);
            if (!response.ok) {
              setError(messageOf(data));
              return;
            }
            setOpen(false);
            await load();
          }}
        />
      )}
    </section>
  );
}

function ProfileDialog({
  profile,
  permissions,
  saving,
  onClose,
  onSave,
}: {
  profile: Profile | null;
  permissions: Permission[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: object) => Promise<void>;
}) {
  const [code, setCode] = useState(profile?.codigo ?? "");
  const [name, setName] = useState(profile?.nome ?? "");
  const [description, setDescription] = useState(profile?.descricao ?? "");
  const [active, setActive] = useState(profile?.ativo ?? true);
  const [assignments, setAssignments] = useState<Assignment>(() =>
    Object.fromEntries(
      (profile?.permissoes ?? []).map((item) => [
        item.permissaoId,
        item.efeito,
      ]),
    ),
  );
  const groups = useMemo(() => {
    const result = new Map<string, Map<string, Permission[]>>();
    permissions.forEach((permission) => {
      if (!result.has(permission.hub)) result.set(permission.hub, new Map());
      const modules = result.get(permission.hub)!;
      if (!modules.has(permission.modulo)) modules.set(permission.modulo, []);
      modules.get(permission.modulo)!.push(permission);
    });
    return result;
  }, [permissions]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const permissoes = Object.entries(assignments)
      .filter(([, effect]) => effect)
      .map(([permissaoId, efeito]) => ({ permissaoId, efeito }));
    const payload = profile
      ? { nome: name, descricao: description, ativo: active, permissoes }
      : { codigo: code, nome: name, descricao: description, permissoes };
    void onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <form onSubmit={submit}>
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <h3 className="text-xl font-bold">
                {profile ? "Editar perfil" : "Novo perfil"}
              </h3>
              <p className="text-sm text-slate-500">
                Defina dados e permissões.
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar">
              <X />
            </button>
          </header>
          <div className="space-y-6 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                Código
                <input
                  disabled={!!profile}
                  required
                  minLength={2}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 disabled:opacity-60 dark:border-slate-700"
                />
              </label>
              <label className="text-sm">
                Nome
                <input
                  required
                  minLength={3}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
                />
              </label>
            </div>
            <label className="block text-sm">
              Descrição
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={255}
                className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
              />
            </label>
            {profile && (
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  disabled={profile.sistema}
                />
                Perfil ativo{" "}
                {profile.sistema && (
                  <span className="text-xs text-slate-500">
                    Perfil de sistema
                  </span>
                )}
              </label>
            )}
            <div>
              <h4 className="font-semibold">Matriz de permissões</h4>
              <p className="text-sm text-slate-500">
                Sem seleção significa ausência de acesso.
              </p>
            </div>
            {[...groups].map(([hub, modules]) => (
              <section
                key={hub}
                className="rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2 border-b border-slate-200 p-4 font-semibold dark:border-slate-800">
                  <ChevronDown size={17} />
                  {hub}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...modules].map(([module, items]) => (
                    <div key={module} className="p-4">
                      <p className="mb-3 text-sm font-semibold">{module}</p>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {items.map((permission) => (
                          <div
                            key={permission.id}
                            className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"
                          >
                            <p className="text-sm font-medium">
                              {permission.acao}
                            </p>
                            <p className="mb-3 text-xs text-slate-500">
                              {permission.descricao}
                            </p>
                            <div className="flex gap-2">
                              {(["PERMITIR", "NEGAR"] as Effect[]).map(
                                (effect) => (
                                  <button
                                    key={effect}
                                    type="button"
                                    onClick={() =>
                                      setAssignments((current) => ({
                                        ...current,
                                        [permission.id]:
                                          current[permission.id] === effect
                                            ? undefined
                                            : effect,
                                      }))
                                    }
                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${assignments[permission.id] === effect ? (effect === "PERMITIR" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "border border-slate-200 dark:border-slate-700"}`}
                                  >
                                    {effect === "PERMITIR" ? (
                                      <Check size={14} />
                                    ) : (
                                      <X size={14} />
                                    )}{" "}
                                    {effect}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
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
              {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
