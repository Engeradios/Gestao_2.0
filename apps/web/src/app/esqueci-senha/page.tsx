"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.message ?? "Não foi possível processar a solicitação.");
      return;
    }

    setMessage(
      data.message ??
        "Se o e-mail estiver cadastrado e ativo, enviaremos as instruções.",
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        /brand/logo_claro.png
        <h1 className="text-2xl font-bold text-white">Esqueci minha senha</h1>
        <p className="mt-3 text-sm text-slate-400">
          Informe o e-mail cadastrado para receber as instruções.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block text-sm text-slate-300">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
            />
          </label>

          {message && (
            <p className="rounded-xl bg-emerald-950 px-4 py-3 text-sm text-emerald-300">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar instruções"}
          </button>

          <Link
            href="/login"
            className="block text-center text-sm text-slate-400 hover:text-white"
          >
            Voltar ao login
          </Link>
        </form>
      </section>
    </main>
  );
}
