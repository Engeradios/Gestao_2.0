"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

interface Item {
  id: string;
  nome: string;
  ativo: boolean;
}

type Tipo = "setores" | "cargos" | "unidades";

const abas: { chave: Tipo; titulo: string }[] = [
  { chave: "setores", titulo: "Setores" },
  { chave: "cargos", titulo: "Cargos" },
  { chave: "unidades", titulo: "Unidades" },
];

export default function DpRhCadastrosPage() {
  const [aba, setAba] = useState<Tipo>("setores");
  const [itens, setItens] = useState<Item[]>([]);
  const [nome, setNome] = useState<string>("");
  const [erro, setErro] = useState<string>("");

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/dp-rh/cadastros/${aba}`, {
        credentials: "include",
      });

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }

      setItens((await resposta.json()) as Item[]);
      setErro("");
    } catch (excecao) {
      setErro(
        excecao instanceof Error ? excecao.message : "Falha ao carregar dados",
      );
    }
  }, [aba]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  async function adicionar(): Promise<void> {
    if (!nome.trim()) {
      return;
    }

    try {
      const resposta = await fetch(`/api/dp-rh/cadastros/${aba}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, ativo: true }),
      });

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }

      setNome("");
      await carregar();
    } catch (excecao) {
      setErro(
        excecao instanceof Error ? excecao.message : "Falha ao salvar registro",
      );
    }
  }

  return (
    <main className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">Cadastros de DP e RH</h1>
        <p className="text-sm text-slate-500">Setores, cargos e unidades</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {abas.map((item) => (
          <button
            key={item.chave}
            type="button"
            onClick={() => setAba(item.chave)}
            className={
              aba === item.chave
                ? "rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
            }
          >
            {item.titulo}
          </button>
        ))}
      </nav>

      {erro ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {erro}
        </p>
      ) : null}

      <section className="flex flex-wrap items-end gap-3">
        <input
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Novo registro"
          className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700"
        />
        <button
          type="button"
          onClick={() => void adicionar()}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-900">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-200 dark:border-slate-800"
              >
                <td className="p-3 font-medium">{item.nome}</td>
                <td className="p-3">{item.ativo ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
