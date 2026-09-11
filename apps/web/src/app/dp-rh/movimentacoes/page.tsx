"use client";

import { useCallback, useEffect, useState } from "react";

interface Movimentacao {
  id: string;
  tipo: string;
  data: string;
  observacao: string | null;
  funcionario: { nome: string; matricula: string | null };
}

export default function DpRhMovimentacoesPage() {
  const [itens, setItens] = useState<Movimentacao[]>([]);
  const [erro, setErro] = useState<string>("");

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/dp-rh/movimentacoes", {
        credentials: "include",
      });

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }

      setItens((await resposta.json()) as Movimentacao[]);
      setErro("");
    } catch (excecao) {
      setErro(
        excecao instanceof Error ? excecao.message : "Falha ao carregar dados",
      );
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  return (
    <main className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">Movimentações</h1>
        <p className="text-sm text-slate-500">
          Histórico de admissões, alterações e desligamentos
        </p>
      </header>

      {erro ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {erro}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-900">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Funcionário</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Observação</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-200 dark:border-slate-800"
              >
                <td className="p-3">{item.data.slice(0, 10)}</td>
                <td className="p-3 font-medium">{item.funcionario.nome}</td>
                <td className="p-3">{item.tipo}</td>
                <td className="p-3">{item.observacao ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
