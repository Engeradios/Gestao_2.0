"use client";

import {
  CalendarDays,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Holiday = {
  id: string;
  data: string;
  nome: string;
  uf: string | null;
  municipio: string | null;
  ativo: boolean;
};

type HolidayForm = {
  data: string;
  nome: string;
  uf: string;
};

const emptyForm: HolidayForm = {
  data: "",
  nome: "",
  uf: "",
};

function dateInput(value: string) {
  return value.slice(0, 10);
}

function messageOf(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "message" in value
  ) {
    const message = (value as {
      message?: string | string[];
    }).message;

    return Array.isArray(message)
      ? message.join(". ")
      : message;
  }

  return undefined;
}

export function OsSlaHolidayEditor({
  holidays,
  onChanged,
}: {
  holidays: Holiday[];
  onChanged: () => void;
}) {
  const [form, setForm] =
    useState<HolidayForm>(emptyForm);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const ordered = useMemo(
    () =>
      [...holidays].sort((a, b) =>
        a.data.localeCompare(b.data),
      ),
    [holidays],
  );

  function update(
    field: keyof HolidayForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSuccess("");
  }

  function edit(holiday: Holiday) {
    setEditingId(holiday.id);
    setForm({
      data: dateInput(holiday.data),
      nome: holiday.nome,
      uf: holiday.uf ?? "",
    });
    setError("");
    setSuccess("");
  }

  function cancel() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const nome = form.nome.trim();
    const uf = form.uf.trim().toUpperCase();

    if (!form.data || nome.length < 2) {
      setError("Informe a data e o nome do feriado.");
      return;
    }

    if (uf && !/^[A-Z]{2}$/.test(uf)) {
      setError("A UF deve conter exatamente duas letras.");
      return;
    }

    setSaving(true);

    const url = editingId
      ? `/api/ferramentas/sla-os/feriados/${editingId}`
      : "/api/ferramentas/sla-os/feriados";

    const response = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: form.data,
        nome,
        uf: uf || null,
      }),
    });

    const data = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(
        messageOf(data) ??
          "Não foi possível salvar o feriado.",
      );
      return;
    }

    setEditingId(null);
    setForm(emptyForm);
    setSuccess(
      editingId
        ? "Feriado atualizado com sucesso."
        : "Feriado cadastrado com sucesso.",
    );
    onChanged();
  }

  async function remove(holiday: Holiday) {
    const confirmed = window.confirm(
      `Excluir o feriado "${holiday.nome}"?`,
    );

    if (!confirmed) return;

    setDeletingId(holiday.id);
    setError("");
    setSuccess("");

    const response = await fetch(
      `/api/ferramentas/sla-os/feriados/${holiday.id}`,
      {
        method: "DELETE",
      },
    );

    const data = await response.json().catch(() => null);
    setDeletingId(null);

    if (!response.ok) {
      setError(
        messageOf(data) ??
          "Não foi possível excluir o feriado.",
      );
      return;
    }

    if (editingId === holiday.id) {
      cancel();
    }

    setSuccess("Feriado excluído com sucesso.");
    onChanged();
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <CalendarDays size={21} className="text-red-600" />

        <div>
          <h2 className="font-bold">Feriados</h2>
          <p className="text-sm text-slate-500">
            Datas nacionais ou estaduais desconsideradas no
            cálculo do SLA.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {success}
        </div>
      )}

      <form
        onSubmit={submit}
        className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-[180px_1fr_100px_auto] md:items-end dark:bg-slate-900"
      >
        <label className="text-sm font-semibold">
          Data
          <input
            type="date"
            required
            value={form.data}
            onChange={(event) =>
              update("data", event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="text-sm font-semibold">
          Nome
          <input
            required
            minLength={2}
            maxLength={160}
            value={form.nome}
            onChange={(event) =>
              update("nome", event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="text-sm font-semibold">
          UF
          <input
            maxLength={2}
            placeholder="Todas"
            value={form.uf}
            onChange={(event) =>
              update("uf", event.target.value.toUpperCase())
            }
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 uppercase dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {editingId ? <Save size={16} /> : <Plus size={16} />}
            {saving
              ? "Salvando..."
              : editingId
                ? "Salvar"
                : "Adicionar"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={cancel}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 dark:border-slate-700"
              aria-label="Cancelar edição"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
        {!ordered.length ? (
          <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-900">
            Nenhum feriado cadastrado.
          </p>
        ) : (
          ordered.map((holiday) => (
            <div
              key={holiday.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900"
            >
              <div>
                <p className="font-semibold">{holiday.nome}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(
                    holiday.data,
                  ).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                  {holiday.uf
                    ? ` · ${holiday.uf}`
                    : " · Nacional"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => edit(holiday)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800"
                  aria-label={`Editar ${holiday.nome}`}
                >
                  <Pencil size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => void remove(holiday)}
                  disabled={deletingId === holiday.id}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900"
                  aria-label={`Excluir ${holiday.nome}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
