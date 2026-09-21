"use client";

import { Clock3, Save } from "lucide-react";
import { useState } from "react";

type Schedule = {
  id?: string;
  diaSemana: number;
  ativo: boolean;
  inicio: string;
  fim: string;
  intervaloInicio: string | null;
  intervaloFim: string | null;
};

const weekdays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function normalizeTime(value: string | null | undefined) {
  if (!value) return "";

  const isoMatch = value.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];

  return value.slice(0, 5);
}

function normalizeSchedules(source: Schedule[]) {
  return weekdays.map((_, diaSemana) => {
    const current = source.find(
      (item) => item.diaSemana === diaSemana,
    );

    return {
      id: current?.id,
      diaSemana,
      ativo: current?.ativo ?? false,
      inicio: normalizeTime(current?.inicio) || "08:00",
      fim: normalizeTime(current?.fim) || "17:00",
      intervaloInicio: normalizeTime(
        current?.intervaloInicio,
      ),
      intervaloFim: normalizeTime(current?.intervaloFim),
    };
  });
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

export function OsSlaScheduleEditor({
  initial,
  onSaved,
}: {
  initial: Schedule[];
  onSaved: () => void;
}) {
  const [schedules, setSchedules] = useState(() =>
    normalizeSchedules(initial),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(
    day: number,
    field: keyof Schedule,
    value: string | boolean | null,
  ) {
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.diaSemana === day
          ? { ...schedule, [field]: value }
          : schedule,
      ),
    );

    setSuccess("");
  }

  async function save() {
    setError("");
    setSuccess("");

    for (const schedule of schedules) {
      if (schedule.fim <= schedule.inicio) {
        setError(
          `${weekdays[schedule.diaSemana]}: o fim deve ser posterior ao início.`,
        );
        return;
      }

      const hasBreakStart = Boolean(
        schedule.intervaloInicio,
      );
      const hasBreakEnd = Boolean(schedule.intervaloFim);

      if (hasBreakStart !== hasBreakEnd) {
        setError(
          `${weekdays[schedule.diaSemana]}: informe início e fim do intervalo.`,
        );
        return;
      }

      if (
        schedule.intervaloInicio &&
        schedule.intervaloFim &&
        !(
          schedule.inicio < schedule.intervaloInicio &&
          schedule.intervaloInicio <
            schedule.intervaloFim &&
          schedule.intervaloFim < schedule.fim
        )
      ) {
        setError(
          `${weekdays[schedule.diaSemana]}: o intervalo deve estar dentro do expediente.`,
        );
        return;
      }
    }

    setSaving(true);

    const response = await fetch(
      "/api/ferramentas/sla-os/horarios",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          horarios: schedules.map((schedule) => ({
            diaSemana: schedule.diaSemana,
            ativo: schedule.ativo,
            inicio: schedule.inicio,
            fim: schedule.fim,
            intervaloInicio:
              schedule.intervaloInicio || null,
            intervaloFim: schedule.intervaloFim || null,
          })),
        }),
      },
    );

    const data = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !data) {
      setError(
        messageOf(data) ??
          "Não foi possível salvar o expediente.",
      );
      return;
    }

    onSaved();
    setSuccess("Expediente atualizado com sucesso.");
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock3 size={21} className="text-red-600" />

          <div>
            <h2 className="font-bold">Expediente semanal</h2>
            <p className="text-sm text-slate-500">
              Configure os períodos contabilizados no SLA.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          <Save size={17} />
          {saving ? "Salvando..." : "Salvar expediente"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {schedules.map((schedule) => (
          <div
            key={schedule.diaSemana}
            className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[170px_repeat(4,minmax(110px,1fr))] md:items-end dark:bg-slate-900"
          >
            <label className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={schedule.ativo}
                onChange={(event) =>
                  update(
                    schedule.diaSemana,
                    "ativo",
                    event.target.checked,
                  )
                }
              />
              {weekdays[schedule.diaSemana]}
            </label>

            <TimeField
              label="Início"
              value={schedule.inicio}
              disabled={!schedule.ativo}
              onChange={(value) =>
                update(schedule.diaSemana, "inicio", value)
              }
            />

            <TimeField
              label="Fim"
              value={schedule.fim}
              disabled={!schedule.ativo}
              onChange={(value) =>
                update(schedule.diaSemana, "fim", value)
              }
            />

            <TimeField
              label="Início intervalo"
              value={schedule.intervaloInicio ?? ""}
              disabled={!schedule.ativo}
              optional
              onChange={(value) =>
                update(
                  schedule.diaSemana,
                  "intervaloInicio",
                  value || null,
                )
              }
            />

            <TimeField
              label="Fim intervalo"
              value={schedule.intervaloFim ?? ""}
              disabled={!schedule.ativo}
              optional
              onChange={(value) =>
                update(
                  schedule.diaSemana,
                  "intervaloFim",
                  value || null,
                )
              }
            />
          </div>
        ))}
      </div>
    </article>
  );
}

function TimeField({
  label,
  value,
  disabled,
  optional = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  optional?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-semibold text-slate-500">
      {label}
      <input
        type="time"
        value={value}
        required={!optional}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}
