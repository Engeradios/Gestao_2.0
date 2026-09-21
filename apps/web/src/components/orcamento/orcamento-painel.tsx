"use client";

import { OrcamentoEvidencias } from "@/components/orcamento/orcamento-evidencias";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Cliente = {
  codigo: string | null;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  municipio: string | null;
  uf: string | null;
};

type Tecnico = {
  nome: string;
  email: string;
  unidade: string | null;
};

type Contadores = {
  respostas: number;
  itens: number;
  evidencias: number;
  historicos: number;
};

type Orcamento = {
  id: string;
  numero: string;
  status: string;
  titulo: string | null;
  criadoEm: string;
  atualizadoEm: string;
  enviadoEm: string | null;
  analisadoEm: string | null;
  propostaNumero: string | null;
  cliente: Cliente;
  tecnico: Tecnico;
  checklistModelo: {
    nome: string;
    versao: number;
  } | null;
  _count: Contadores;
};

type Resultado = {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  registros: Orcamento[];
};

const STATUS = [
  ["", "Todos os status"],
  ["RASCUNHO", "Rascunho"],
  ["EM_PREENCHIMENTO", "Em preenchimento"],
  ["ENVIADO_ANALISE", "Enviado para análise"],
  ["DEVOLVIDO_CORRECAO", "Devolvido para correção"],
  ["APROVADO", "Aprovado"],
  ["RECUSADO", "Recusado"],
  ["VINCULADO_PROPOSTA", "Vinculado à proposta"],
];

function labelStatus(value: string) {
  return (
    STATUS.find(([status]) => status === value)?.[1] ??
    value.replaceAll("_", " ")
  );
}

function formatDate(value: string | null) {
  if (!value) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function clienteNome(cliente: Cliente) {
  return cliente.nomeFantasia || cliente.razaoSocial;
}

export function OrcamentoPainel() {
  const router = useRouter();
  const [dados, setDados] = useState<Resultado | null>(null);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [status, setStatus] = useState("");
  const [pagina, setPagina] = useState(1);
  const [selecionado, setSelecionado] = useState<Orcamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: "20",
    });

    if (buscaAplicada) params.set("busca", buscaAplicada);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/orcamentos?${params}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const body = (await response.json()) as Resultado | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in body && body.message
            ? body.message
            : "Não foi possível consultar os orçamentos.",
        );
      }

      const resultado = body as Resultado;
      setDados(resultado);

      setSelecionado((atual) => {
        if (!atual) return null;

        return resultado.registros.find((item) => item.id === atual.id) ?? null;
      });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Falha inesperada ao consultar os orçamentos.",
      );
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, pagina, router, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregar();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [carregar]);

  function pesquisar(event: FormEvent) {
    event.preventDefault();
    setPagina(1);
    setBuscaAplicada(busca.trim());
  }

  function limpar() {
    setBusca("");
    setBuscaAplicada("");
    setStatus("");
    setPagina(1);
    setSelecionado(null);
  }

  return (
    <section className="space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Orçamento
        </p>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">
          Painel de Orçamentos
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Consulte, filtre e selecione os orçamentos cadastrados.
        </p>
      </header>

      <form
        onSubmit={pesquisar}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[1fr_240px_auto_auto]"
      >
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Número, título ou cliente"
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
        />

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPagina(1);
          }}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
        >
          {STATUS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Pesquisar
        </button>

        <button
          type="button"
          onClick={limpar}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Limpar
        </button>
      </form>

      {erro && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
            {carregando
              ? "Carregando..."
              : `${dados?.total ?? 0} orçamento(s) encontrado(s)`}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Técnico</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Atualização</th>
                </tr>
              </thead>
              <tbody>
                {dados?.registros.map((item) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    onClick={() => setSelecionado(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setSelecionado(item);
                    }}
                    className="cursor-pointer border-t border-slate-100 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  >
                    <td className="px-4 py-3 font-medium">{item.numero}</td>
                    <td className="px-4 py-3">{clienteNome(item.cliente)}</td>
                    <td className="px-4 py-3">{item.tecnico.nome}</td>
                    <td className="px-4 py-3">{labelStatus(item.status)}</td>
                    <td className="px-4 py-3">
                      {formatDate(item.atualizadoEm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
            {dados?.registros.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelecionado(item)}
                className="block w-full space-y-2 p-4 text-left"
              >
                <div className="flex justify-between gap-3">
                  <strong>{item.numero}</strong>
                  <span className="text-xs">{labelStatus(item.status)}</span>
                </div>
                <p className="text-sm">{clienteNome(item.cliente)}</p>
                <p className="text-xs text-slate-500">
                  {item.tecnico.nome} · {formatDate(item.atualizadoEm)}
                </p>
              </button>
            ))}
          </div>

          {!carregando && dados?.registros.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">
              Nenhum orçamento encontrado.
            </p>
          )}

          <footer className="flex items-center justify-between border-t border-slate-200 p-4 text-sm dark:border-slate-800">
            <button
              type="button"
              disabled={pagina <= 1 || carregando}
              onClick={() => setPagina((value) => Math.max(1, value - 1))}
              className="rounded-lg border px-3 py-2 disabled:opacity-40 dark:border-slate-700"
            >
              Anterior
            </button>

            <span>
              Página {dados?.pagina ?? pagina} de{" "}
              {Math.max(1, dados?.totalPaginas ?? 1)}
            </span>

            <button
              type="button"
              disabled={
                carregando || pagina >= Math.max(1, dados?.totalPaginas ?? 1)
              }
              onClick={() => setPagina((value) => value + 1)}
              className="rounded-lg border px-3 py-2 disabled:opacity-40 dark:border-slate-700"
            >
              Próxima
            </button>
          </footer>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {!selecionado ? (
            <p className="text-sm text-slate-500">
              Selecione um orçamento para visualizar o resumo.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Orçamento</p>
                <h2 className="text-xl font-semibold">{selecionado.numero}</h2>
                <p className="text-sm">{selecionado.titulo || "Sem título"}</p>
              </div>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Cliente</dt>
                  <dd>{clienteNome(selecionado.cliente)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Técnico</dt>
                  <dd>{selecionado.tecnico.nome}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Checklist</dt>
                  <dd>
                    {selecionado.checklistModelo?.nome ?? "Não vinculado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd>{labelStatus(selecionado.status)}</dd>
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
                  <strong className="block text-lg">
                    {selecionado._count.itens}
                  </strong>
                  Itens
                </div>
                <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
                  <strong className="block text-lg">
                    {selecionado._count.evidencias}
                  </strong>
                  Evidências
                </div>
              </div>

              <OrcamentoEvidencias
                orcamentoId={selecionado.id}
                editavel={[
                  "RASCUNHO",
                  "EM_PREENCHIMENTO",
                  "DEVOLVIDO_CORRECAO",
                ].includes(selecionado.status)}
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
