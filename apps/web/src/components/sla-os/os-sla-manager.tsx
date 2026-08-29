"use client";

import {
  RefreshCw,
  Save,
  Timer,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { OsSlaHolidayEditor } from "./os-sla-holiday-editor";
import { OsSlaScheduleEditor } from "./os-sla-schedule-editor";

type Schedule = {
  id: string;
  diaSemana: number;
  ativo: boolean;
  inicio: string;
  fim: string;
  intervaloInicio: string | null;
  intervaloFim: string | null;
};

type Holiday = {
  id: string;
  data: string;
  nome: string;
  uf: string | null;
  municipio: string | null;
  ativo: boolean;
};

type Configuration = {
  id: string;
  nome: string;
  ativo: boolean;
  normalAteMinutos: number;
  atencaoAteMinutos: number;
  urgenteAteMinutos: number;
  fusoHorario: string;
  atualizadoEm: string;
  horarios: Schedule[];
  feriados: Holiday[];
};

type FormState = {
  normalAteMinutos: string;
  atencaoAteMinutos: string;
  urgenteAteMinutos: string;
  fusoHorario: string;
};

function hours(minutes: string) {
  const parsed = Number(minutes);

  if (!Number.isFinite(parsed)) return "-";

  return `${(parsed / 60).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })} h`;
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

export function OsSlaManager() {
  const [configuration, setConfiguration] =
    useState<Configuration | null>(null);
  const [form, setForm] = useState<FormState>({
    normalAteMinutos: "",
    atencaoAteMinutos: "",
    urgenteAteMinutos: "",
    fusoHorario: "America/Sao_Paulo",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/ferramentas/sla-os", {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      setError(
        messageOf(data) ??
          "Não foi possível carregar a configuração SLA.",
      );
      setLoading(false);
      return;
    }

    const loaded = data as Configuration;

    setConfiguration(loaded);
    setForm({
      normalAteMinutos: String(loaded.normalAteMinutos),
      atencaoAteMinutos: String(loaded.atencaoAteMinutos),
      urgenteAteMinutos: String(loaded.urgenteAteMinutos),
      fusoHorario: loaded.fusoHorario,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSuccess("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normal = Number(form.normalAteMinutos);
    const attention = Number(form.atencaoAteMinutos);
    const urgent = Number(form.urgenteAteMinutos);

    if (
      !Number.isInteger(normal) ||
      !Number.isInteger(attention) ||
      !Number.isInteger(urgent)
    ) {
      setError("Informe limites inteiros em minutos.");
      return;
    }

    if (!(normal < attention && attention < urgent)) {
      setError(
        "Os limites devem seguir Normal < Atenção < Urgente.",
      );
      return;
    }

    setSaving(true);

    const response = await fetch("/api/ferramentas/sla-os", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        normalAteMinutos: normal,
        atencaoAteMinutos: attention,
        urgenteAteMinutos: urgent,
        fusoHorario: form.fusoHorario.trim(),
      }),
    });

    const data = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(
        messageOf(data) ??
          "Não foi possível salvar a configuração.",
      );
      return;
    }

    setConfiguration(data as Configuration);
    setSuccess("Configuração SLA atualizada com sucesso.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Ferramentas
          </p>
          <h1 className="text-3xl font-bold">
            SLA de Ordens de Serviço
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure limites de classificação, expediente e
            calendário utilizados no cálculo do SLA.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Atualizar
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {success}
        </div>
      )}

      {loading && !configuration ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          Carregando configuração...
        </div>
      ) : (
        <>
          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-red-100 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">
                <Timer size={21} />
              </span>
              <div>
                <h2 className="font-bold">
                  Limites de classificação
                </h2>
                <p className="text-sm text-slate-500">
                  Valores contabilizados somente durante o
                  expediente configurado.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <LimitField
                label="Normal até"
                value={form.normalAteMinutos}
                hint={hours(form.normalAteMinutos)}
                color="emerald"
                onChange={(value) =>
                  update("normalAteMinutos", value)
                }
              />

              <LimitField
                label="Atenção até"
                value={form.atencaoAteMinutos}
                hint={hours(form.atencaoAteMinutos)}
                color="amber"
                onChange={(value) =>
                  update("atencaoAteMinutos", value)
                }
              />

              <LimitField
                label="Urgente até"
                value={form.urgenteAteMinutos}
                hint={hours(form.urgenteAteMinutos)}
                color="orange"
                onChange={(value) =>
                  update("urgenteAteMinutos", value)
                }
              />
            </div>

            <label className="mt-5 block text-sm font-semibold">
              Fuso horário
              <input
                value={form.fusoHorario}
                onChange={(event) =>
                  update("fusoHorario", event.target.value)
                }
                maxLength={80}
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-red-500 dark:border-slate-700"
              />
            </label>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Save size={17} />
                {saving ? "Salvando..." : "Salvar configuração"}
              </button>
            </div>
          </form>

          <section className="grid gap-6">
            <OsSlaScheduleEditor
              key={configuration?.atualizadoEm ?? "sla-schedules"}
              initial={configuration?.horarios ?? []}
              onSaved={() => void load()}
            />

            <OsSlaHolidayEditor
              holidays={configuration?.feriados ?? []}
              onChanged={() => void load()}
            />
          </section>
        </>
      )}
    </div>
  );
}

function LimitField({
  label,
  value,
  hint,
  color,
  onChange,
}: {
  label: string;
  value: string;
  hint: string;
  color: "emerald" | "amber" | "orange";
  onChange: (value: string) => void;
}) {
  const colors = {
    emerald:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
    amber:
      "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
    orange:
      "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30",
  }[color];

  return (
    <label
      className={`rounded-2xl border p-4 ${colors}`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <input
        type="number"
        min={1}
        max={5256000}
        step={1}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-2xl font-bold outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-950"
      />
      <span className="mt-2 block text-xs text-slate-500">
        {hint} · valor em minutos
      </span>
    </label>
  );
}
