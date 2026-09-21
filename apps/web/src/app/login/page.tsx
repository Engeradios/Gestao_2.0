"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setCarregando(true);

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        senha: form.get("senha"),
      }),
    });

    const data = await response.json().catch(() => ({}));
    setCarregando(false);

    if (!response.ok) {
      setErro(data.message ?? "Não foi possível entrar.");
      return;
    }

    router.push(data.usuario?.trocarSenha ? "/trocar-senha" : "/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8">
          <Image
            src="/brand/logo_claro.png"
            alt="Engerádios"
            className="mb-7 max-h-16 max-w-full"
          />

          <h1 className="mt-2 text-3xl font-bold text-white">Gestão 2.0</h1>

          <p className="mt-3 text-sm text-slate-400">
            Entre com suas credenciais corporativas.
          </p>
        </div>

        <form onSubmit={entrar} className="space-y-5">
          <label className="block text-sm text-slate-300">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
            />
          </label>

          <label className="block text-sm text-slate-300">
            Senha
            <input
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
            />
          </label>

          <div className="text-right">
            <Link
              href="/esqueci-senha"
              className="text-sm text-red-400 hover:text-red-300"
            >
              Esqueci minha senha
            </Link>
          </div>

          {erro && (
            <p className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-300">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
