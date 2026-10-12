"use client";

import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  FileClock,
  FileSearch,
  Files,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlink2,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Registro = Record<string, unknown>;

type Resumo = {
  total: number | string;
  recebidos: number | string;
  emitidos: number | string;
  pendentes: number | string;
  integrados: number | string;
  divergencias: number | string;
  cancelados: number | string;
  semXml: number | string;
  semVinculoFinanceiro: number | string;
  porTipo: unknown[] | Registro | null;
  porFilial: unknown[] | Registro | null;
  porStatus: unknown[] | Registro | null;
};

type ListaNormalizada = {
  items: Registro[];
  total: number;
};

function numero(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function texto(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function mensagemErro(body: unknown, status: number): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body
  ) {
    const message = (body as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.map(String).join(" ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  if (status === 401) return "A sessão expirou. Entre novamente.";
  if (status === 403) return "Seu perfil não possui acesso a esta área.";
  if (status === 404) return "O recurso solicitado não foi localizado.";

  return `Não foi possível concluir a consulta (HTTP ${status}).`;
}

async function consultar<T>(path: string): Promise<T> {
  const response = await fetch(
    `/api/financeiro/documentos-fiscais${path}`,
    {
      cache: "no-store",
      credentials: "same-origin",
    },
  );

  const raw = await response.text();

  let body: unknown = null;

  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = raw;
  }

  if (!response.ok) {
    throw new Error(mensagemErro(body, response.status));
  }

  return body as T;
}

function normalizarLista(value: unknown): ListaNormalizada {
  if (Array.isArray(value)) {
    return {
      items: value.filter(
        (item): item is Registro =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item),
      ),
      total: value.length,
    };
  }

  if (!value || typeof value !== "object") {
    return { items: [], total: 0 };
  }

  const record = value as Registro;

  const candidatos = [
    record.items,
    record.data,
    record.documentos,
    record.resultados,
  ];

  const source = candidatos.find(Array.isArray);

  const items = Array.isArray(source)
    ? source.filter(
        (item): item is Registro =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item),
      )
    : [];

  return {
    items,
    total: numero(
      record.total ??
        record.totalItems ??
        record.totalRegistros ??
        items.length,
    ),
  };
}

function rotuloCampo(key: string): string {
  const known: Record<string, string> = {
    id: "ID",
    numero: "Número",
    serie: "Série",
    chave: "Chave",
    tipo: "Tipo",
    tipoDocumento: "Tipo",
    tipo_documento: "Tipo",
    direcao: "Direção",
    status: "Status",
    situacao: "Situação",
    filial: "Filial",
    filialNome: "Filial",
    emitente: "Emitente",
    emitenteNome: "Emitente",
    emit_nome: "Emitente",
    destinatario: "Destinatário",
    destinatarioNome: "Destinatário",
    valor: "Valor",
    valorTotal: "Valor total",
    valor_total: "Valor total",
    dataEmissao: "Emissão",
    data_emissao: "Emissão",
    criadoEm: "Criado em",
    criado_em: "Criado em",
  };

  return (
    known[key] ??
    key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (char) => char.toUpperCase())
  );
}

function formatarValor(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (
    /valor|total/i.test(key) &&
    Number.isFinite(Number(value))
  ) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  }

  if (/data|emissao|criado|atualizado/i.test(key)) {
    const date = new Date(String(value));

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
      }).format(date);
    }
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  return texto(value);
}

function Card({
  title,
  value,
  icon: Icon,
  tone = "slate",
}: {
  title: string;
  value: number;
  icon: typeof Files;
  tone?: "slate" | "blue" | "emerald" | "amber" | "red";
}) {
  const classes = {
    slate:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    blue:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    red:
      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>

        <span
          className={`grid h-11 w-11 place-items-center rounded-xl ${classes[tone]}`}
        >
          <Icon size={21} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div
      className="grid min-h-56 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      role="status"
    >
      <div className="text-center">
        <Loader2
          className="mx-auto animate-spin text-red-600"
          size={30}
        />
        <p className="mt-3 text-sm font-medium">
          Consultando documentos fiscais
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Aguarde a resposta da API.
        </p>
      </div>
    </div>
  );
}

export function DocumentosFiscaisProfissional() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [lista, setLista] = useState<ListaNormalizada>({
    items: [],
    total: 0,
  });

  const [pagina, setPagina] = useState(1);
  const [buscaLocal, setBuscaLocal] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(
    null,
  );

  const pageSize = 10;

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const [summary, records] = await Promise.all([
        consultar<Resumo>("/resumo"),
        consultar<unknown>(
          `?page=${pagina}&pageSize=${pageSize}`,
        ),
      ]);

      setResumo(summary);
      setLista(normalizarLista(records));
      setAtualizadoEm(new Date());
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : "Falha inesperada ao consultar os documentos fiscais.",
      );
    } finally {
      setCarregando(false);
    }
  }, [pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const itensFiltrados = useMemo(() => {
    const query = buscaLocal.trim().toLocaleLowerCase("pt-BR");

    if (!query) return lista.items;

    return lista.items.filter((item) =>
      Object.values(item).some((value) =>
        texto(value)
          .toLocaleLowerCase("pt-BR")
          .includes(query),
      ),
    );
  }, [buscaLocal, lista.items]);

  const colunas = useMemo(() => {
    const ordered: string[] = [];

    for (const item of itensFiltrados) {
      for (const key of Object.keys(item)) {
        if (!ordered.includes(key)) {
          ordered.push(key);
        }
      }
    }

    return ordered.slice(0, 8);
  }, [itensFiltrados]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(lista.total / pageSize),
  );

  const cards = resumo
    ? [
        {
          title: "Total",
          value: numero(resumo.total),
          icon: Files,
          tone: "blue" as const,
        },
        {
          title: "Recebidos",
          value: numero(resumo.recebidos),
          icon: Archive,
          tone: "slate" as const,
        },
        {
          title: "Emitidos",
          value: numero(resumo.emitidos),
          icon: FileCheck2,
          tone: "emerald" as const,
        },
        {
          title: "Pendentes",
          value: numero(resumo.pendentes),
          icon: FileClock,
          tone: "amber" as const,
        },
        {
          title: "Integrados",
          value: numero(resumo.integrados),
          icon: CheckCircle2,
          tone: "emerald" as const,
        },
        {
          title: "Divergências",
          value: numero(resumo.divergencias),
          icon: AlertCircle,
          tone: "red" as const,
        },
        {
          title: "Cancelados",
          value: numero(resumo.cancelados),
          icon: XCircle,
          tone: "slate" as const,
        },
        {
          title: "Sem XML",
          value: numero(resumo.semXml),
          icon: FileSearch,
          tone: "amber" as const,
        },
        {
          title: "Sem vínculo financeiro",
          value: numero(resumo.semVinculoFinanceiro),
          icon: Unlink2,
          tone: "red" as const,
        },
      ]
    : [];

  return (
    <main
      className="mx-auto max-w-[1600px] space-y-6"
      data-f5c2="documentos-fiscais-profissional"
    >
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-r from-red-50 via-white to-slate-50 px-6 py-6 dark:border-slate-800 dark:from-red-950/30 dark:via-slate-950 dark:to-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
                <ShieldCheck size={27} aria-hidden="true" />
              </span>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                  Gestão fiscal
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                  Documentos fiscais
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Visão consolidada dos documentos fiscais,
                  integrações e pendências operacionais.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void carregar()}
              disabled={carregando}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
            >
              <RefreshCw
                size={16}
                className={carregando ? "animate-spin" : ""}
              />
              Atualizar
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-950">
              <ShieldCheck size={14} className="text-emerald-600" />
              Consulta protegida por RBAC
            </span>

            {atualizadoEm ? (
              <span>
                Atualizado em{" "}
                {atualizadoEm.toLocaleString("pt-BR")}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {erro ? (
        <section
          role="alert"
          className="flex gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold">
              Não foi possível carregar a área fiscal
            </p>
            <p className="mt-1 text-sm">{erro}</p>
          </div>
        </section>
      ) : null}

      {carregando && !resumo ? (
        <LoadingState />
      ) : (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
            aria-label="Indicadores fiscais"
          >
            {cards.map((card) => (
              <Card key={card.title} {...card} />
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold">
                  Repositório fiscal
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {lista.total} documento(s) localizado(s)
                </p>
              </div>

              <label className="relative block w-full max-w-md">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <span className="sr-only">
                  Pesquisar nos resultados exibidos
                </span>
                <input
                  value={buscaLocal}
                  onChange={(event) =>
                    setBuscaLocal(event.target.value)
                  }
                  placeholder="Pesquisar nos resultados exibidos"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-transparent pl-10 pr-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-slate-700"
                />
              </label>
            </div>

            {carregando ? (
              <div className="p-8">
                <LoadingState />
              </div>
            ) : itensFiltrados.length === 0 ? (
              <div className="grid min-h-72 place-items-center p-8 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900">
                    <Files size={30} />
                  </span>
                  <h3 className="mt-5 text-xl font-bold">
                    Nenhum documento encontrado
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Não existem documentos fiscais para a página
                    atual ou para o texto pesquisado.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                    <tr>
                      {colunas.map((key) => (
                        <th
                          key={key}
                          className="whitespace-nowrap px-5 py-3 font-semibold"
                        >
                          {rotuloCampo(key)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {itensFiltrados.map((item, index) => (
                      <tr
                        key={texto(item.id) || String(index)}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/70"
                      >
                        {colunas.map((key) => (
                          <td
                            key={key}
                            className="max-w-sm whitespace-nowrap px-5 py-3"
                            title={formatarValor(key, item[key])}
                          >
                            <span className="block max-w-xs truncate">
                              {formatarValor(key, item[key])}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800">
              <p className="text-slate-500">
                Página {pagina} de {totalPaginas}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagina <= 1 || carregando}
                  onClick={() =>
                    setPagina((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={
                    pagina >= totalPaginas || carregando
                  }
                  onClick={() =>
                    setPagina((current) =>
                      Math.min(totalPaginas, current + 1),
                    )
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  Próxima
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <CircleDollarSign
                size={21}
                className="text-emerald-600"
              />
              <h3 className="mt-4 font-bold">
                Integração financeira
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Acompanhe documentos já integrados e registros sem
                vínculo financeiro.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <FileSearch size={21} className="text-amber-600" />
              <h3 className="mt-4 font-bold">
                Integridade documental
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Identifique documentos sem XML e divergências que
                exigem análise operacional.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <ShieldCheck size={21} className="text-red-600" />
              <h3 className="mt-4 font-bold">
                Acesso controlado
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                O acesso depende da permissão fiscal configurada no
                perfil do usuário.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default DocumentosFiscaisProfissional;
