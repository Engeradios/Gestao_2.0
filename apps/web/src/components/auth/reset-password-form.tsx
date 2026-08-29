"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ResetPasswordForm({
  token,
  title,
}: {
  token: string;
  title: string;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        novaSenha: form.get("novaSenha"),
        confirmarSenha: form.get("confirmarSenha"),
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      const detail = Array.isArray(data.message)
        ? data.message.join(". ")
        : data.message;

      setError(detail ?? "Link inválido, expirado ou já utilizado.");

      return;
    }

    setMessage("Senha definida com sucesso. Agora você pode entrar.");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        /brand/logo_claro.png
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {!token ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-red-950 p-4 text-sm text-red-300">
              Link inválido, incompleto ou expirado.
            </p>

            <Link
              href="/esqueci-senha"
              className="block rounded-xl bg-red-600 px-4 py-3 text-center font-semibold text-white hover:bg-red-500"
            >
              Reenviar e-mail de acesso
            </Link>

            <Link
              href="/login"
              className="block text-center text-sm text-slate-400 hover:text-white"
            >
              Voltar ao login
            </Link>
          </div>
        ) : message ? (
          <div className="mt-6">
            <p className="rounded-xl bg-emerald-950 p-4 text-sm text-emerald-300">
              {message}
            </p>

            <Link
              href="/login"
              className="mt-5 block rounded-xl bg-red-600 px-4 py-3 text-center font-semibold text-white"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block text-sm text-slate-300">
              Nova senha
              <input
                name="novaSenha"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Confirmar nova senha
              <input
                name="confirmarSenha"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
              />
            </label>

            {error && (
              <div className="space-y-4">
                <p className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>

                <Link
                  href="/esqueci-senha"
                  className="block rounded-xl bg-red-600 px-4 py-3 text-center font-semibold text-white hover:bg-red-500"
                >
                  Solicitar novo e-mail
                </Link>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Definir senha"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
