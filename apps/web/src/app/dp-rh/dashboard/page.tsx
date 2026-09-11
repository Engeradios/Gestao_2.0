"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  RefreshCw,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ItemNome {
  nome: string;
  total: number;
}

interface ItemMotivo {
  motivo: string;
  total: number;
}

interface Dashboard {
  ativos: number;
  afastados: number;
  admissoes: number;
  desligamentos: number;
  turnoverPercentual: number;
  turnoverDesligamentos: number;
  porSetor: ItemNome[];
  porMotivo: ItemMotivo[];
}

const inicial: Dashboard = {
  ativos: 0,
  afastados: 0,
  admissoes: 0,
  desligamentos: 0,
  turnoverPercentual: 0,
  turnoverDesligamentos: 0,
  porSetor: [],
  porMotivo: [],
};

const cores = ["#dc2626", "#f97316", "#0ea5e9", "#22c55e", "#a855f7"];

export default function DpRhDashboardPage() {
  const [dados, setDados] = useState<Dashboard>(inicial);
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");
  const [erro, setErro] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(true);

  const carregar = useCallback(async () => {
    setCarregando(true);

    try {
      const params = new URLSearchParams();

      if (inicio) {
        params.set("inicio", inicio);
      }

      if (fim) {
        params.set("fim", fim);
      }

      const resposta = await fetch(
        `/api/dp-rh/dashboard?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }

      const json = (await resposta.json()) as Dashboard;
      setDados(json);
      setErro("");
    } catch (excecao) {
      setErro(
        excecao instanceof Error
          ? excecao.message
          : "Falha ao carregar indicadores",
      );
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  const cards = [
    { titulo: "Ativos", valor: String(dados.ativos), Icone: Users },
    { titulo: "Afastados", valor: String(dados.afastados), Icone: UserCheck },
    { titulo: "Admissões", valor: String(dados.admissoes), Icone: UserPlus },
    {
      titulo: "Desligamentos",
      valor: String(dados.desligamentos),
      Icone: UserMinus,
    },
    {
      titulo: "Turnover geral",
      valor: `${dados.turnoverPercentual.toFixed(2)}%`,
      Icone: BarChart3,
    },
    {
      titulo: "Turnover saídas",
      valor: `${dados.turnoverDesligamentos.toFixed(2)}%`,
      Icone: BarChart3,
    },
  ];

  const movimento = [
    { nome: "Admissões", total: dados.admissoes },
    { nome: "Desligamentos", total: dados.desligamentos },
  ];

  return (
    <main className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">DP e RH</h1>
          <p className="text-sm text-slate-500">
            Indicadores de funcionários e turnover
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Início</span>
            <input
              type="date"
              value={inicio}
              onChange={(evento) => setInicio(evento.target.value)}
              className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Fim</span>
            <input
              type="date"
              value={fim}
              onChange={(evento) => setFim(evento.target.value)}
              className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700"
            />
          </label>

          <button
            type="button"
            onClick={() => void carregar()}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </header>

      {erro ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {erro}
        </p>
      ) : null}

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando indicadores...</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ titulo, valor, Icone }) => (
          <article
            key={titulo}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <Icone className="mb-3 h-5 w-5 text-red-600" />
            <p className="text-sm text-slate-500">{titulo}</p>
            <strong className="text-2xl">{valor}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="h-80 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 font-semibold">Admissões e desligamentos</h2>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={movimento}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#dc2626" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-80 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 font-semibold">Funcionários por setor</h2>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={dados.porSetor}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="h-80 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-4 font-semibold">Desligamentos por motivo</h2>
        <ResponsiveContainer width="100%" height="88%">
          <PieChart>
            <Tooltip />
            <Pie
              data={dados.porMotivo}
              dataKey="total"
              nameKey="motivo"
              outerRadius={110}
              label
            >
              {dados.porMotivo.map((item, indice) => (
                <Cell key={item.motivo} fill={cores[indice % cores.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </section>
    </main>
  );
}
