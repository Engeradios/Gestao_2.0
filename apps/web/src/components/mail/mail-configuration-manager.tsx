"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, PlugZap, Save, Send } from "lucide-react";

interface MailConfiguration {
  id: number;
  host: string | null;
  porta: number;
  seguranca: "SSL" | "STARTTLS" | "NENHUMA";
  usuario: string | null;
  remetenteEmail: string | null;
  remetenteNome: string | null;
  responderPara: string | null;
  ativo: boolean;
  timeoutSegundos: number;
  testadoEm: string | null;
  testeSucesso: boolean | null;
  testeDetalhe: string | null;
  senhaConfigurada: boolean;
  atualizadoEm: string;
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-950";

function messageOf(value: unknown, fallback: string) {
  if (typeof value === "object" && value !== null && "message" in value) {
    const message = value.message;

    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string") return message;
  }

  return fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Nunca";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MailConfigurationManager() {
  const [configuration, setConfiguration] = useState<MailConfiguration | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ferramentas/configuracao-email", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          messageOf(data, "Não foi possível carregar a configuração."),
        );
      }

      setConfiguration(data as MailConfiguration);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar a configuração.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const values = new FormData(form);

    setAction("save");
    setError("");
    setMessage("");

    const payload = {
      host: String(values.get("host") || ""),
      porta: Number(values.get("porta")),
      seguranca: values.get("seguranca"),
      usuario: String(values.get("usuario") || ""),
      senha: String(values.get("senha") || "") || undefined,
      remetenteEmail: String(values.get("remetenteEmail") || ""),
      remetenteNome: String(values.get("remetenteNome") || ""),
      responderPara: String(values.get("responderPara") || ""),
      ativo: values.get("ativo") === "on",
      timeoutSegundos: Number(values.get("timeoutSegundos")),
    };

    try {
      const response = await fetch("/api/ferramentas/configuracao-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          messageOf(data, "Não foi possível salvar a configuração."),
        );
      }
      const passwordInput = form.elements.namedItem("senha");

      if (passwordInput instanceof HTMLInputElement) {
        passwordInput.value = "";
      }

      setConfiguration(data as MailConfiguration);
      setMessage("Configuração SMTP salva com sucesso.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar a configuração.",
      );
    } finally {
      setAction("");
    }
  }

  async function execute(endpoint: string, operation: string, body?: object) {
    setAction(operation);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/ferramentas/configuracao-email/${endpoint}`,
        {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(messageOf(data, "Não foi possível executar o teste."));
      }

      setMessage(
        operation === "verify"
          ? "Conexão SMTP validada com sucesso."
          : "Mensagem de teste enviada com sucesso.",
      );

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível executar o teste.",
      );
    } finally {
      setAction("");
    }
  }

  async function sendTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const values = new FormData(event.currentTarget);

    await execute("enviar-teste", "send", {
      destinatario: String(values.get("destinatario") || ""),
    });
  }

  if (loading && !configuration) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="animate-spin text-red-600" />
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="rounded-xl bg-red-100 p-4 text-red-800 dark:bg-red-950 dark:text-red-300">
        {error || "Configuração de e-mail indisponível."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
          Ferramentas
        </p>
        <h1 className="mt-1 text-3xl font-bold">Configuração de e-mail</h1>
        <p className="mt-2 text-sm text-slate-500">
          Configure o SMTP utilizado pelas notificações do sistema.
        </p>
      </header>

      {message && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs uppercase text-slate-500">Status</p>
          <p className="mt-2 font-semibold">
            {configuration.ativo ? "Ativo" : "Inativo"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs uppercase text-slate-500">Senha SMTP</p>
          <p className="mt-2 font-semibold">
            {configuration.senhaConfigurada ? "Configurada" : "Não configurada"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs uppercase text-slate-500">Último teste</p>
          <p className="mt-2 font-semibold">
            {formatDate(configuration.testadoEm)}
          </p>
          {configuration.testeDetalhe && (
            <p className="mt-1 text-xs text-slate-500">
              {configuration.testeDetalhe}
            </p>
          )}
        </article>
      </section>

      <form
        onSubmit={save}
        className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mb-6 flex items-center gap-3">
          <Mail className="text-red-600" />
          <h2 className="text-lg font-semibold">Servidor SMTP</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm md:col-span-2">
            Servidor
            <input
              name="host"
              defaultValue={configuration.host || ""}
              maxLength={255}
              className={fieldClass}
              placeholder="smtp.exemplo.com.br"
            />
          </label>

          <label className="text-sm">
            Porta
            <input
              name="porta"
              type="number"
              min={1}
              max={65535}
              required
              defaultValue={configuration.porta}
              className={fieldClass}
            />
          </label>

          <label className="text-sm">
            Segurança
            <select
              name="seguranca"
              defaultValue={configuration.seguranca}
              className={fieldClass}
            >
              <option value="SSL">SSL</option>
              <option value="STARTTLS">STARTTLS</option>
              <option value="NENHUMA">Nenhuma</option>
            </select>
          </label>

          <label className="text-sm">
            Usuário
            <input
              name="usuario"
              defaultValue={configuration.usuario || ""}
              maxLength={255}
              autoComplete="username"
              className={fieldClass}
            />
          </label>

          <label className="text-sm">
            Nova senha
            <input
              name="senha"
              type="password"
              maxLength={500}
              autoComplete="new-password"
              className={fieldClass}
              placeholder={
                configuration.senhaConfigurada
                  ? "Deixe vazio para manter"
                  : "Informe a senha"
              }
            />
          </label>

          <label className="text-sm">
            E-mail do remetente
            <input
              name="remetenteEmail"
              type="email"
              defaultValue={configuration.remetenteEmail || ""}
              maxLength={255}
              className={fieldClass}
            />
          </label>

          <label className="text-sm">
            Nome do remetente
            <input
              name="remetenteNome"
              defaultValue={configuration.remetenteNome || ""}
              maxLength={160}
              className={fieldClass}
            />
          </label>

          <label className="text-sm">
            Responder para
            <input
              name="responderPara"
              type="email"
              defaultValue={configuration.responderPara || ""}
              maxLength={255}
              className={fieldClass}
            />
          </label>

          <label className="text-sm">
            Timeout em segundos
            <input
              name="timeoutSegundos"
              type="number"
              min={5}
              max={120}
              required
              defaultValue={configuration.timeoutSegundos}
              className={fieldClass}
            />
          </label>

          <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
            <input
              name="ativo"
              type="checkbox"
              defaultChecked={configuration.ativo}
              className="h-4 w-4 accent-red-600"
            />
            Ativar envio de e-mails
          </label>
        </div>

        <button
          type="submit"
          disabled={Boolean(action)}
          className="mt-6 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {action === "save" ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          Salvar configuração
        </button>
      </form>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="font-semibold">Testar conexão</h2>
          <p className="mt-2 text-sm text-slate-500">
            Valida conexão, segurança e autenticação SMTP.
          </p>

          <button
            type="button"
            disabled={Boolean(action)}
            onClick={() => void execute("testar-conexao", "verify")}
            className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold dark:border-slate-700"
          >
            {action === "verify" ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <PlugZap size={17} />
            )}
            Testar conexão
          </button>
        </article>

        <form
          onSubmit={sendTest}
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
        >
          <h2 className="font-semibold">Enviar mensagem de teste</h2>

          <label className="mt-4 block text-sm">
            Destinatário
            <input
              name="destinatario"
              type="email"
              required
              maxLength={255}
              className={fieldClass}
            />
          </label>

          <button
            type="submit"
            disabled={Boolean(action)}
            className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold dark:border-slate-700"
          >
            {action === "send" ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}
            Enviar teste
          </button>
        </form>
      </section>
    </div>
  );
}
