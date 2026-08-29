"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-950";

export function AccountSecurityManager() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const values = new FormData(form);

    const novaSenha = String(values.get("novaSenha") || "");
    const confirmarSenha = String(values.get("confirmarSenha") || "");

    setError("");

    if (novaSenha !== confirmarSenha) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senhaAtual: values.get("senhaAtual"),
          novaSenha,
          confirmarSenha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(". ")
          : data.message;

        throw new Error(message || "Não foi possível alterar a senha.");
      }

      router.replace("/login?senhaAlterada=1");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível alterar a senha.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
          Minha conta
        </p>
        <h1 className="mt-1 text-3xl font-bold">Senha e segurança</h1>
        <p className="mt-2 text-sm text-slate-500">
          Mantenha as credenciais da conta protegidas.
        </p>
      </header>

      <form
        onSubmit={changePassword}
        className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h2 className="font-semibold">Alterar senha</h2>
            <p className="text-sm text-slate-500">
              Após a alteração, será necessário entrar novamente.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm">
            Senha atual
            <input
              name="senhaAtual"
              type="password"
              required
              autoComplete="current-password"
              className={fieldClass}
            />
          </label>

          <label className="block text-sm">
            Nova senha
            <input
              name="novaSenha"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className={fieldClass}
            />
          </label>

          <label className="block text-sm">
            Confirmar nova senha
            <input
              name="confirmarSenha"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className={fieldClass}
            />
          </label>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Utilize pelo menos 12 caracteres e não repita a senha atual.
        </p>

        {error && (
          <p className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <KeyRound size={17} />
          )}
          Alterar senha
        </button>
      </form>

      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 size={18} />A sessão atual será encerrada depois da
        alteração.
      </div>
    </div>
  );
}
