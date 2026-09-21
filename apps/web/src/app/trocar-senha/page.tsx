"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function alterarSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setCarregando(true);

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senhaAtual: form.get("senhaAtual"),
        novaSenha: form.get("novaSenha"),
        confirmarSenha: form.get("confirmarSenha"),
      }),
    });

    const data = await response.json();
    setCarregando(false);

    if (!response.ok) {
      const message = Array.isArray(data.message)
        ? data.message.join(". ")
        : data.message;

      setErro(message ?? "Não foi possível alterar a senha.");
      return;
    }

    router.replace("/login?senhaAlterada=1");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8">
          <div className="mb-5 h-2 w-16 rounded-full bg-red-600" />

          <p className="text-sm font-semibold uppercase tracking-widest text-red-400">
            Segurança
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">
            Troque sua senha
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            A senha temporária deve ser substituída antes de acessar o sistema.
          </p>
        </div>

        <form onSubmit={alterarSenha} className="space-y-5">
          <label className="block text-sm text-slate-300">
            Senha atual
            <input
              name="senhaAtual"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
            />
          </label>

          <label className="block text-sm text-slate-300">
            Nova senha
            <input
              name="novaSenha"
              type="password"
              required
              minLength={12}
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
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
            />
          </label>

          <p className="text-xs text-slate-500">
            Utilize pelo menos 12 caracteres e não repita a senha atual.
          </p>

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
            {carregando ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </section>
    </main>
  );
}
