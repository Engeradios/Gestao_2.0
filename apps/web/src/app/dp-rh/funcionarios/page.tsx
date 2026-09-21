"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Plus, Search } from "lucide-react";

interface Relacionado {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  nome: string;
  cpf: string | null;
  matricula: string | null;
  status: string;
  dataAdmissao: string;
  setor: Relacionado | null;
  cargo: Relacionado | null;
  unidade: Relacionado | null;
}

interface Resposta {
  total: number;
  pagina: number;
  tamanho: number;
  itens: Funcionario[];
}

interface Formulario {
  nome: string;
  cpf: string;
  matricula: string;
  email: string;
  telefone: string;
  dataAdmissao: string;
  setorId: string;
  cargoId: string;
  unidadeId: string;
}

const vazio: Formulario = {
  nome: "",
  cpf: "",
  matricula: "",
  email: "",
  telefone: "",
  dataAdmissao: "",
  setorId: "",
  cargoId: "",
  unidadeId: "",
};

const estiloCampo =
  "rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700";

const estiloBotao =
  "inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700";

const estiloPrimario =
  "inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white";

export default function DpRhFuncionariosPage() {
  const [dados, setDados] = useState<Resposta>({
    total: 0,
    pagina: 1,
    tamanho: 50,
    itens: [],
  });

  const [busca, setBusca] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [setores, setSetores] = useState<Relacionado[]>([]);
  const [cargos, setCargos] = useState<Relacionado[]>([]);
  const [unidades, setUnidades] = useState<Relacionado[]>([]);
  const [form, setForm] = useState<Formulario>(vazio);
  const [aberto, setAberto] = useState<boolean>(false);
  const [erro, setErro] = useState<string>("");
  const [mensagem, setMensagem] = useState<string>("");

  const carregar = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (busca) {
        params.set("busca", busca);
      }

      if (status) {
        params.set("status", status);
      }

      const url = "/api/dp-rh/funcionarios?" + params.toString();

      const resposta = await fetch(url, { credentials: "include" });

      if (!resposta.ok) {
        throw new Error("HTTP " + String(resposta.status));
      }

      const json = (await resposta.json()) as Resposta;
      setDados(json);
      setErro("");
    } catch (excecao) {
      const texto =
        excecao instanceof Error ? excecao.message : "Falha ao carregar";
      setErro(texto);
    }
  }, [busca, status]);

  const carregarCadastros = useCallback(async () => {
    try {
      const opcoes = { credentials: "include" as const };

      const resSetores = await fetch("/api/dp-rh/cadastros/setores", opcoes);
      const resCargos = await fetch("/api/dp-rh/cadastros/cargos", opcoes);
      const resUnidades = await fetch("/api/dp-rh/cadastros/unidades", opcoes);

      if (resSetores.ok) {
        setSetores((await resSetores.json()) as Relacionado[]);
      }

      if (resCargos.ok) {
        setCargos((await resCargos.json()) as Relacionado[]);
      }

      if (resUnidades.ok) {
        setUnidades((await resUnidades.json()) as Relacionado[]);
      }
    } catch {
      setErro("Falha ao carregar cadastros");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
    void carregarCadastros();
  }, [carregar, carregarCadastros]);

  function exportar(): void {
    const params = new URLSearchParams();

    if (busca) {
      params.set("busca", busca);
    }

    if (status) {
      params.set("status", status);
    }

    const base = "/api/dp-rh/relatorios/funcionarios.csv?";
    const url = base + params.toString();

    const link = document.createElement("a");
    link.href = url;
    link.download = "funcionarios.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function salvar(): Promise<void> {
    try {
      const corpo: Record<string, unknown> = {
        nome: form.nome,
        dataAdmissao: form.dataAdmissao,
      };

      if (form.cpf) {
        corpo.cpf = form.cpf;
      }

      if (form.matricula) {
        corpo.matricula = form.matricula;
      }

      if (form.email) {
        corpo.email = form.email;
      }

      if (form.telefone) {
        corpo.telefone = form.telefone;
      }

      if (form.setorId) {
        corpo.setorId = form.setorId;
      }

      if (form.cargoId) {
        corpo.cargoId = form.cargoId;
      }

      if (form.unidadeId) {
        corpo.unidadeId = form.unidadeId;
      }

      const resposta = await fetch("/api/dp-rh/funcionarios", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });

      if (!resposta.ok) {
        throw new Error("HTTP " + String(resposta.status));
      }

      setMensagem("Funcionario cadastrado com sucesso");
      setForm(vazio);
      setAberto(false);
      await carregar();
    } catch (excecao) {
      const texto =
        excecao instanceof Error ? excecao.message : "Falha ao salvar";
      setErro(texto);
    }
  }

  return (
    <main className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Funcionarios</h1>
          <p className="text-sm text-slate-500">
            Total de {dados.total} registros
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, matricula ou CPF"
            className={estiloCampo}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={estiloCampo}
          >
            <option value="">Todas</option>
            <option value="ATIVO">Ativo</option>
            <option value="AFASTADO">Afastado</option>
            <option value="DESLIGADO">Desligado</option>
          </select>

          <button
            type="button"
            onClick={() => void carregar()}
            className={estiloBotao}
          >
            <Search className="h-4 w-4" />
            Filtrar
          </button>

          <button type="button" onClick={exportar} className={estiloBotao}>
            <Download className="h-4 w-4" />
            Exportar
          </button>

          <button
            type="button"
            onClick={() => setAberto(!aberto)}
            className={estiloPrimario}
          >
            <Plus className="h-4 w-4" />
            Novo
          </button>
        </div>
      </header>

      {erro ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>
      ) : null}

      {mensagem ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {mensagem}
        </p>
      ) : null}

      {aberto ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 font-semibold">Novo funcionario</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              placeholder="Nome completo"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className={estiloCampo}
            />

            <input
              placeholder="CPF"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              className={estiloCampo}
            />

            <input
              placeholder="Matricula"
              value={form.matricula}
              onChange={(e) => setForm({ ...form, matricula: e.target.value })}
              className={estiloCampo}
            />

            <input
              type="date"
              value={form.dataAdmissao}
              onChange={(e) =>
                setForm({ ...form, dataAdmissao: e.target.value })
              }
              className={estiloCampo}
            />

            <input
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={estiloCampo}
            />

            <input
              placeholder="Telefone"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className={estiloCampo}
            />

            <select
              value={form.setorId}
              onChange={(e) => setForm({ ...form, setorId: e.target.value })}
              className={estiloCampo}
            >
              <option value="">Setor</option>
              {setores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>

            <select
              value={form.cargoId}
              onChange={(e) => setForm({ ...form, cargoId: e.target.value })}
              className={estiloCampo}
            >
              <option value="">Cargo</option>
              {cargos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>

            <select
              value={form.unidadeId}
              onChange={(e) => setForm({ ...form, unidadeId: e.target.value })}
              className={estiloCampo}
            >
              <option value="">Unidade</option>
              {unidades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className={estiloBotao}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => void salvar()}
              className={estiloPrimario}
            >
              Salvar
            </button>
          </div>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-900">
            <tr>
              <th className="p-3">Matricula</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Cargo</th>
              <th className="p-3">Setor</th>
              <th className="p-3">Unidade</th>
              <th className="p-3">Admissao</th>
              <th className="p-3">Situacao</th>
            </tr>
          </thead>
          <tbody>
            {dados.itens.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-200 dark:border-slate-800"
              >
                <td className="p-3">{item.matricula ?? "-"}</td>
                <td className="p-3 font-medium">{item.nome}</td>
                <td className="p-3">{item.cargo?.nome ?? "-"}</td>
                <td className="p-3">{item.setor?.nome ?? "-"}</td>
                <td className="p-3">{item.unidade?.nome ?? "-"}</td>
                <td className="p-3">{item.dataAdmissao.slice(0, 10)}</td>
                <td className="p-3">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
