"use client";

import { Bell, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Preferences {
  receberSolicitacoes: boolean;
  receberAberturaServico: boolean;
  receberConclusaoFaturamento: boolean;
  receberLogistica: boolean;
  receberNotificacoesSistema: boolean;
  areaServicos: string;
  ativo: boolean;
  atualizadoEm: string;
}

function messageOf(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: string | string[] }).message;

    return Array.isArray(message) ? message.join(". ") : message;
  }

  return undefined;
}

export function NotificationPreferencesManager() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/usuarios/me/preferencias-notificacao", {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(messageOf(data) ?? "Não foi possível carregar as preferências.");
      setLoading(false);
      return;
    }

    setPreferences(data as Preferences);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="grid min-h-[320px] place-items-center">
        <Loader2 className="animate-spin text-red-600" />
      </div>
    );
  }

  const options = preferences
    ? [
        ["Solicitações internas", preferences.receberSolicitacoes],
        ["Abertura de serviços", preferences.receberAberturaServico],
        ["Conclusão e faturamento", preferences.receberConclusaoFaturamento],
        ["Eventos de logística", preferences.receberLogistica],
        ["Comunicados gerais", preferences.receberNotificacoesSistema],
      ]
    : [];

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
          Minha conta
        </p>
        <h1 className="mt-1 text-3xl font-bold">Notificações</h1>
        <p className="mt-2 text-sm text-slate-500">
          Consulte as preferências definidas pela administração.
        </p>
      </header>

      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
        <ShieldCheck className="shrink-0" size={20} />
        As associações de eventos e destinatários são gerenciadas pelos
        administradores em Ferramentas.
      </div>

      {error && (
        <p className="rounded-xl bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {preferences && (
        <div className="rounded-2xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-xl bg-red-100 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">
              <Bell size={21} />
            </span>
            <div>
              <h2 className="font-semibold">Eventos associados</h2>
              <p className="text-sm text-slate-500">
                Área: {preferences.areaServicos}
              </p>
            </div>
          </div>

          <div className="divide-y dark:divide-slate-800">
            {options.map(([label, enabled]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between py-4"
              >
                <span className="text-sm font-medium">{String(label)}</span>
                <span
                  className={
                    enabled
                      ? "text-sm font-semibold text-emerald-600"
                      : "text-sm text-slate-400"
                  }
                >
                  {enabled ? "Ativo" : "Inativo"}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Preferência geral: {preferences.ativo ? "ativa" : "suspensa"}
          </p>
        </div>
      )}
    </section>
  );
}
