"use client";

import {
  CarFront,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Vehicle = {
  id: string;
  legadoId?: number | null;
  placa: string;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ativo: boolean;
  _count?: { entregas: number };
};

type PageData = {
  items: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type FormState = {
  id?: string;
  placa: string;
  tipo: string;
  marca: string;
  modelo: string;
  legadoId: string;
  ativo: boolean;
};

const emptyForm: FormState = {
  placa: "",
  tipo: "",
  marca: "",
  modelo: "",
  legadoId: "",
  ativo: true,
};

function errorMessage(data: unknown) {
  if (data && typeof data === "object" && "message" in data) {
    const value = (data as { message?: string | string[] }).message;
    return Array.isArray(value) ? value.join(". ") : value;
  }

  return undefined;
}

function normalizePlate(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

export function VehicleManager({ canManage }: { canManage: boolean }) {
  const [data, setData] = useState<PageData>({
    items: [],
    pagination: { page: 1, limit: 25, total: 0, pages: 0 },
  });
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("true");
  const [typeFilter, setTypeFilter] = useState("");
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
    if (typeFilter.trim()) query.set("tipo", typeFilter.trim());

    const response = await fetch(
      `/api/ferramentas/cadastros/veiculos?${query}`,
      { cache: "no-store" },
    );

    const body = await response.json();

    if (response.ok) setData(body);
    else {
      setNotice(errorMessage(body) ?? "Não foi possível carregar os veículos.");
    }

    setLoading(false);
  }, [active, page, search, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  function create() {
    setForm(emptyForm);
    setNotice("");
    setModal(true);
  }

  function edit(vehicle: Vehicle) {
    setForm({
      id: vehicle.id,
      placa: vehicle.placa,
      tipo: vehicle.tipo ?? "",
      marca: vehicle.marca ?? "",
      modelo: vehicle.modelo ?? "",
      legadoId:
        vehicle.legadoId === null || vehicle.legadoId === undefined
          ? ""
          : String(vehicle.legadoId),
      ativo: vehicle.ativo,
    });

    setNotice("");
    setModal(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice("");

    const response = await fetch(
      form.id
        ? `/api/ferramentas/cadastros/veiculos/${form.id}`
        : "/api/ferramentas/cadastros/veiculos",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placa: normalizePlate(form.placa),
          tipo: form.tipo || undefined,
          marca: form.marca || undefined,
          modelo: form.modelo || undefined,
          legadoId: form.legadoId ? Number(form.legadoId) : undefined,
          ativo: form.ativo,
        }),
      },
    );

    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setNotice(errorMessage(body) ?? "Não foi possível salvar o veículo.");
      return;
    }

    setModal(false);
    setNotice("Veículo salvo com sucesso.");
    await load();
  }

  async function toggleStatus(vehicle: Vehicle) {
    const response = await fetch(
      `/api/ferramentas/cadastros/veiculos/${vehicle.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !vehicle.ativo }),
      },
    );

    const body = await response.json();

    if (!response.ok) {
      setNotice(errorMessage(body) ?? "Não foi possível alterar o status.");
      return;
    }

    setNotice("Status do veículo atualizado.");
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Ferramentas · Cadastros
          </p>
          <h1 className="mt-1 text-3xl font-bold">Veículos</h1>
          <p className="mt-2 text-sm text-slate-500">
            Frota utilizada nos módulos operacionais e logísticos.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={create}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white"
          >
            <Plus size={18} />
            Novo veículo
          </button>
        )}
      </header>

      <p aria-live="polite" className="text-sm text-amber-700">
        {notice}
      </p>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_220px_160px] dark:bg-slate-950">
        <label className="relative">
          <span className="sr-only">Pesquisar veículos</span>
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
            placeholder="Placa, marca, modelo ou tipo"
            className="w-full rounded-xl border bg-transparent py-3 pl-10 pr-3"
          />
        </label>

        <input
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value.toUpperCase());
            setPage(1);
          }}
          placeholder="Filtrar por tipo"
          className="rounded-xl border bg-transparent px-3"
        />

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
                <th className="px-5 py-3">Veículo</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Entregas</th>
                <th className="px-5 py-3">Situação</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y dark:divide-slate-800">
              {data.items.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
                        <CarFront size={19} />
                      </span>
                      <div>
                        <strong>{vehicle.placa}</strong>
                        <p className="text-xs text-slate-500">
                          {[vehicle.marca, vehicle.modelo]
                            .filter(Boolean)
                            .join(" ") || "Não informado"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {vehicle.tipo || "Não informado"}
                  </td>
                  <td className="px-5 py-4">{vehicle._count?.entregas ?? 0}</td>
                  <td className="px-5 py-4">
                    {vehicle.ativo ? "Ativo" : "Inativo"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {canManage && (
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => edit(vehicle)}
                          aria-label={`Editar veículo ${vehicle.placa}`}
                          className="rounded-lg border p-2"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(vehicle)}
                          className="rounded-lg border px-3 py-2 text-xs font-semibold"
                        >
                          {vehicle.ativo ? "Inativar" : "Ativar"}
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
            Nenhum veículo encontrado.
          </p>
        )}

        <footer className="flex items-center justify-between border-t p-4 dark:border-slate-800">
          <span className="text-sm text-slate-500">
            {data.pagination.total} veículo(s)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
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
              onClick={() => setPage((value) => value + 1)}
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
            aria-labelledby="vehicle-dialog-title"
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950"
          >
            <header className="flex justify-between">
              <h2 id="vehicle-dialog-title" className="text-2xl font-bold">
                {form.id ? "Editar veículo" : "Novo veículo"}
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
              <label className="text-sm">
                Placa
                <input
                  required
                  minLength={7}
                  maxLength={7}
                  value={form.placa}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      placa: normalizePlate(event.target.value),
                    }))
                  }
                  placeholder="ABC1D23"
                  className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 uppercase"
                />
              </label>

              {(["tipo", "marca", "modelo"] as const).map((field) => (
                <label key={field} className="text-sm capitalize">
                  {field}
                  <input
                    value={form[field]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field]: event.target.value.toUpperCase(),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
                  />
                </label>
              ))}

              <label className="text-sm">
                Identificador legado
                <input
                  type="number"
                  min="1"
                  value={form.legadoId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      legadoId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ativo: event.target.checked,
                    }))
                  }
                />
                Veículo ativo
              </label>

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
