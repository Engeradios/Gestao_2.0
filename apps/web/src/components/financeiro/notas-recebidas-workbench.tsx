"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type JsonRecord = Record<string, unknown>;

type StatusConferencia =
  | "PENDENTE_CONFERENCIA"
  | "EM_CONFERENCIA"
  | "ACEITA"
  | "RECUSADA"
  | "DIVERGENTE"
  | "CANCELADA";

type ManifestacaoTipo =
  | "CIENCIA"
  | "CONFIRMACAO"
  | "DESCONHECIMENTO"
  | "NAO_REALIZADA";

interface Filial {
  id: string;
  nome?: string | null;
  razao_social?: string | null;
  cnpj?: string | null;
}

interface ItemNota {
  id: string;
  descricao?: string | null;
  codigo?: string | null;
  ncm?: string | null;
  cfop?: string | null;
  unidade?: string | null;
  quantidade?: string | number | null;
  quantidade_conferida?: string | number | null;
  valor_unit?: string | number | null;
  valor_total?: string | number | null;
  produto_id?: string | null;
  compras_pedido_item_id?: string | null;
  unidade_estoque?: string | null;
  fator_conversao?: string | number | null;
  movimenta_estoque?: boolean | null;
  estoque_movimentado?: boolean | null;
  divergencia?: string | null;
  p5_produto?: JsonRecord | null;
  p5_pedido_item?: JsonRecord | null;
}

interface ParcelaNota {
  id: string;
  numero?: string | number | null;
  vencimento?: string | null;
  valor?: string | number | null;
  status?: string | null;
  conta_pagar_id?: string | null;
}

interface EventoNota {
  id: string;
  tipo?: string | null;
  descricao?: string | null;
  status_anterior?: string | null;
  status_novo?: string | null;
  protocolo?: string | null;
  usuario_nome?: string | null;
  criado_em?: string | null;
  dados?: unknown;
}

interface MovimentoNota {
  id: string;
  tipo?: string | null;
  origem?: string | null;
  quantidade?: string | number | null;
  custo_unitario?: string | number | null;
  valor_total?: string | number | null;
  documento?: string | null;
  criado_em?: string | null;
}

interface NotaRecebida {
  id: string;
  filial_id?: string | null;
  tipo_documento?: string | null;
  chave?: string | null;
  numero?: string | null;
  serie?: string | null;
  emit_cnpj?: string | null;
  emit_nome?: string | null;
  emit_fantasia?: string | null;
  data_emissao?: string | null;
  valor_total?: string | number | null;
  situacao?: string | null;
  status_conferencia?: StatusConferencia | null;
  resumo_apenas?: boolean | null;
  dest_cnpj?: string | null;
  manifestacao_tipo?: ManifestacaoTipo | null;
  manifestacao_status?: string | null;
  manifestacao_protocolo?: string | null;
  estoque_status?: string | null;
  enviado_pagar?: boolean | null;
  conferido_por_nome?: string | null;
  conferido_em?: string | null;
  motivo_recusa?: string | null;
  divergencia_obs?: string | null;
  fornecedor_id?: string | null;
  compras_pedido_id?: string | null;
  fin_filiais?: Filial | null;
  fin_notas_recebidas_itens?: ItemNota[];
  fin_notas_recebidas_parcelas?: ParcelaNota[];
  p5_eventos?: EventoNota[];
  p5_movimentos?: MovimentoNota[];
  p5_fornecedor?: JsonRecord | null;
  p5_compras_pedido?: JsonRecord | null;
}

interface ItemConferencia {
  itemId: string;
  produtoId: string;
  comprasPedidoItemId: string;
  quantidadeConferida: string;
  unidadeEstoque: string;
  fatorConversao: string;
  movimentaEstoque: boolean;
  divergencia: string;
}

const statusOptions: Array<{
  value: StatusConferencia | "";
  label: string;
}> = [
  { value: "", label: "Todos os status" },
  { value: "PENDENTE_CONFERENCIA", label: "Pendente" },
  { value: "EM_CONFERENCIA", label: "Em conferência" },
  { value: "ACEITA", label: "Aceita" },
  { value: "RECUSADA", label: "Recusada" },
  { value: "DIVERGENTE", label: "Divergente" },
  { value: "CANCELADA", label: "Cancelada" },
];

const statusLabels: Record<string, string> = {
  PENDENTE_CONFERENCIA: "Pendente",
  EM_CONFERENCIA: "Em conferência",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
  DIVERGENTE: "Divergente",
  CANCELADA: "Cancelada",
};

const statusStyles: Record<string, string> = {
  PENDENTE_CONFERENCIA:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
  EM_CONFERENCIA:
    "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
  ACEITA:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
  RECUSADA:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200",
  DIVERGENTE:
    "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200",
  CANCELADA:
    "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items: unknown }).items)
  ) {
    return (value as { items: T[] }).items;
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  return [];
}

function text(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue(value));
}

function dateTime(value: unknown): string {
  if (!value) {
    return "Não informado";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function dateOnly(value: unknown): string {
  if (!value) {
    return "Não informado";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

function digits(value: unknown): string {
  return text(value).replace(/\D/g, "");
}

function cnpj(value: unknown): string {
  const raw = digits(value);

  if (raw.length !== 14) {
    return raw || "Não informado";
  }

  return raw.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

async function friendly(response: Response): Promise<string> {
  const body = await response.text();

  if (!body) {
    return `Erro HTTP ${response.status}`;
  }

  try {
    const parsed = JSON.parse(body) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(" ");
    }

    return parsed.message ?? parsed.error ?? body;
  } catch {
    return body;
  }
}

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `/api/financial/received-invoices${path}`,
    {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(await friendly(response));
  }

  const body = await response.text();

  return (body ? JSON.parse(body) : null) as T;
}

function inicializarItens(nota: NotaRecebida): ItemConferencia[] {
  return (nota.fin_notas_recebidas_itens ?? []).map((item) => ({
    itemId: item.id,
    produtoId: item.produto_id ?? "",
    comprasPedidoItemId: item.compras_pedido_item_id ?? "",
    quantidadeConferida: text(
      item.quantidade_conferida ?? item.quantidade ?? "",
    ),
    unidadeEstoque: item.unidade_estoque ?? item.unidade ?? "",
    fatorConversao: text(item.fator_conversao ?? "1"),
    movimentaEstoque: Boolean(item.movimenta_estoque),
    divergencia: item.divergencia ?? "",
  }));
}

function SummaryCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 shadow-sm",
        emphasis
          ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      ].join(" ")}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const value = status ?? "PENDENTE_CONFERENCIA";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusStyles[value] ??
          "border-slate-300 bg-slate-100 text-slate-800",
      ].join(" ")}
    >
      {statusLabels[value] ?? value}
    </span>
  );
}

export function NotasRecebidasWorkbench() {
  const [notas, setNotas] = useState<NotaRecebida[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [selecionada, setSelecionada] =
    useState<NotaRecebida | null>(null);

  const [busca, setBusca] = useState("");
  const [filialId, setFilialId] = useState("");
  const [status, setStatus] = useState<StatusConferencia | "">("");

  const [carregando, setCarregando] = useState(true);
  const [carregandoDetalhe, setCarregandoDetalhe] =
    useState(false);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [statusConferencia, setStatusConferencia] =
    useState<StatusConferencia>("ACEITA");
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [divergenciaObs, setDivergenciaObs] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [pedidoId, setPedidoId] = useState("");
  const [itensConferencia, setItensConferencia] =
    useState<ItemConferencia[]>([]);

  const [manifestacaoTipo, setManifestacaoTipo] =
    useState<ManifestacaoTipo>("CIENCIA");
  const [manifestacaoProtocolo, setManifestacaoProtocolo] =
    useState("");
  const [manifestacaoDescricao, setManifestacaoDescricao] =
    useState("");

  const [localEstoqueId, setLocalEstoqueId] = useState("");
  const [observacaoEstoque, setObservacaoEstoque] = useState("");

  const carregarFiliais = useCallback(async () => {
    try {
      const response = await fetch("/api/financeiro/filiais", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await friendly(response));
      }

      setFiliais(asArray<Filial>(await response.json()));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as filiais.",
      );
    }
  }, []);

  const carregarNotas = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const query = new URLSearchParams();

      if (busca.trim()) {
        query.set("busca", busca.trim());
      }

      if (filialId) {
        query.set("filialId", filialId);
      }

      if (status) {
        query.set("statusConferencia", status);
      }

      const data = await api<unknown>(
        `${query.size ? `?${query.toString()}` : ""}`,
      );

      setNotas(asArray<NotaRecebida>(data));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as notas.",
      );
    } finally {
      setCarregando(false);
    }
  }, [busca, filialId, status]);

  const abrirDetalhe = useCallback(async (id: string) => {
    setCarregandoDetalhe(true);
    setErro("");
    setMensagem("");

    try {
      const nota = await api<NotaRecebida>(`/${id}`);

      setSelecionada(nota);
      setStatusConferencia(
        nota.status_conferencia === "CANCELADA"
          ? "EM_CONFERENCIA"
          : nota.status_conferencia ?? "ACEITA",
      );
      setMotivoRecusa(nota.motivo_recusa ?? "");
      setDivergenciaObs(nota.divergencia_obs ?? "");
      setFornecedorId(nota.fornecedor_id ?? "");
      setPedidoId(nota.compras_pedido_id ?? "");
      setItensConferencia(inicializarItens(nota));
      setManifestacaoTipo(
        nota.manifestacao_tipo ?? "CIENCIA",
      );
      setManifestacaoProtocolo(
        nota.manifestacao_protocolo ?? "",
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível detalhar a nota.",
      );
    } finally {
      setCarregandoDetalhe(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([carregarNotas(), carregarFiliais()]);
  }, [carregarNotas, carregarFiliais]);

  useEffect(() => {
    const refresh = () => {
      void carregarNotas();
    };

    window.addEventListener(
      "financeiro:notas-recebidas:refresh",
      refresh,
    );

    return () => {
      window.removeEventListener(
        "financeiro:notas-recebidas:refresh",
        refresh,
      );
    };
  }, [carregarNotas]);

  const indicadores = useMemo(() => {
    const result = {
      total: notas.length,
      pendentes: 0,
      aceitas: 0,
      recusadas: 0,
      divergentes: 0,
      valor: 0,
    };

    notas.forEach((nota) => {
      result.valor += numberValue(nota.valor_total);

      switch (nota.status_conferencia) {
        case "ACEITA":
          result.aceitas += 1;
          break;
        case "RECUSADA":
          result.recusadas += 1;
          break;
        case "DIVERGENTE":
          result.divergentes += 1;
          break;
        case "PENDENTE_CONFERENCIA":
        case "EM_CONFERENCIA":
        case null:
        case undefined:
          result.pendentes += 1;
          break;
      }
    });

    return result;
  }, [notas]);

  const executar = useCallback(
    async (
      confirmacao: string,
      action: () => Promise<unknown>,
      sucesso: string,
    ) => {
      if (!window.confirm(confirmacao)) {
        return;
      }

      setExecutando(true);
      setErro("");
      setMensagem("");

      try {
        await action();
        setMensagem(sucesso);
        await carregarNotas();

        if (selecionada) {
          await abrirDetalhe(selecionada.id);
        }
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a operação.",
        );
      } finally {
        setExecutando(false);
      }
    },
    [abrirDetalhe, carregarNotas, selecionada],
  );

  const atualizarItem = (
    itemId: string,
    patch: Partial<ItemConferencia>,
  ) => {
    setItensConferencia((current) =>
      current.map((item) =>
        item.itemId === itemId ? { ...item, ...patch } : item,
      ),
    );
  };

  const enviarConferencia = async (event: FormEvent) => {
    event.preventDefault();

    if (!selecionada) {
      return;
    }

    if (
      statusConferencia === "RECUSADA" &&
      !motivoRecusa.trim()
    ) {
      setErro("Informe o motivo da recusa.");
      return;
    }

    if (
      statusConferencia === "DIVERGENTE" &&
      !divergenciaObs.trim()
    ) {
      setErro("Descreva a divergência encontrada.");
      return;
    }

    const payload = {
      status: statusConferencia,
      motivoRecusa:
        statusConferencia === "RECUSADA"
          ? motivoRecusa.trim()
          : undefined,
      divergenciaObs:
        statusConferencia === "DIVERGENTE"
          ? divergenciaObs.trim()
          : undefined,
      fornecedorId: fornecedorId || undefined,
      comprasPedidoId: pedidoId || undefined,
      itens: itensConferencia.map((item) => ({
        itemId: item.itemId,
        produtoId: item.produtoId || undefined,
        comprasPedidoItemId:
          item.comprasPedidoItemId || undefined,
        quantidadeConferida:
          item.quantidadeConferida === ""
            ? undefined
            : Number(item.quantidadeConferida),
        unidadeEstoque:
          item.unidadeEstoque || undefined,
        fatorConversao:
          item.fatorConversao === ""
            ? undefined
            : Number(item.fatorConversao),
        movimentaEstoque: item.movimentaEstoque,
        divergencia: item.divergencia || undefined,
      })),
    };

    await executar(
      `Confirma o resultado da conferência como "${
        statusLabels[statusConferencia] ?? statusConferencia
      }"?`,
      () =>
        api(`/${selecionada.id}/check`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      "Conferência registrada com sucesso.",
    );
  };

  const enviarManifestacao = async (event: FormEvent) => {
    event.preventDefault();

    if (!selecionada) {
      return;
    }

    await executar(
      "Confirma o registro desta manifestação fiscal?",
      () =>
        api(`/${selecionada.id}/manifestation`, {
          method: "POST",
          body: JSON.stringify({
            tipo: manifestacaoTipo,
            protocolo:
              manifestacaoProtocolo.trim() || undefined,
            descricao:
              manifestacaoDescricao.trim() || undefined,
          }),
        }),
      "Manifestação registrada com sucesso.",
    );
  };

  const movimentarEstoque = async (event: FormEvent) => {
    event.preventDefault();

    if (!selecionada) {
      return;
    }

    if (!localEstoqueId.trim()) {
      setErro("Informe o ID do local de estoque.");
      return;
    }

    await executar(
      "Esta ação criará movimentos e atualizará saldos de estoque. Deseja continuar?",
      () =>
        api(`/${selecionada.id}/stock-entry`, {
          method: "POST",
          body: JSON.stringify({
            localId: localEstoqueId.trim(),
            observacao:
              observacaoEstoque.trim() || undefined,
          }),
        }),
      "Entrada em estoque registrada.",
    );
  };

  const enviarContasPagar = async () => {
    if (!selecionada) {
      return;
    }

    await executar(
      "Confirma o envio da nota e de suas parcelas para Contas a Pagar?",
      () =>
        api(`/${selecionada.id}/send-to-payables`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      "Nota enviada para Contas a Pagar.",
    );
  };

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="Notas exibidas"
          value={indicadores.total}
          emphasis
        />
        <SummaryCard
          label="Pendentes"
          value={indicadores.pendentes}
        />
        <SummaryCard
          label="Aceitas"
          value={indicadores.aceitas}
        />
        <SummaryCard
          label="Recusadas"
          value={indicadores.recusadas}
        />
        <SummaryCard
          label="Divergentes"
          value={indicadores.divergentes}
        />
        <SummaryCard
          label="Valor exibido"
          value={money(indicadores.valor)}
        />
      </div>

      <form
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(240px,1fr)_220px_220px_auto] dark:border-slate-800 dark:bg-slate-950"
        onSubmit={(event) => {
          event.preventDefault();
          void carregarNotas();
        }}
      >
        <input
          className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
          placeholder="Chave, número, CNPJ ou emitente"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />

        <select
          className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          value={filialId}
          onChange={(event) => setFilialId(event.target.value)}
        >
          <option value="">Todas as filiais</option>
          {filiais.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.nome ??
                filial.razao_social ??
                filial.cnpj ??
                filial.id}
            </option>
          ))}
        </select>

        <select
          className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as StatusConferencia | "",
            )
          }
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={carregando}
          type="submit"
        >
          {carregando ? "Carregando..." : "Pesquisar"}
        </button>
      </form>

      {erro ? (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {erro}
        </div>
      ) : null}

      {mensagem ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {mensagem}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {carregando ? (
          <div className="p-8 text-center text-slate-500">
            Carregando notas recebidas...
          </div>
        ) : notas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold">
              Nenhuma nota encontrada
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Use a consulta por chave acima para localizar e
              importar uma NF-e, ou altere os filtros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Emitente</th>
                  <th className="px-4 py-3">Emissão</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Conferência</th>
                  <th className="px-4 py-3">Estoque</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {notas.map((nota) => (
                  <tr
                    key={nota.id}
                    className="border-t border-slate-200 align-top dark:border-slate-800"
                  >
                    <td className="px-4 py-3">
                      <b>
                        {nota.tipo_documento ?? "NF-e"}{" "}
                        {nota.numero ?? "Sem número"}
                      </b>
                      <div className="text-xs text-slate-500">
                        Série {nota.serie ?? "N/I"}
                      </div>
                      <div
                        className="mt-1 max-w-48 truncate text-xs text-slate-500"
                        title={nota.chave ?? ""}
                      >
                        {nota.chave ?? "Sem chave"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <b>
                        {nota.emit_fantasia ??
                          nota.emit_nome ??
                          "Não informado"}
                      </b>
                      <div className="text-xs text-slate-500">
                        {cnpj(nota.emit_cnpj)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {dateOnly(nota.data_emissao)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {money(nota.valor_total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={nota.status_conferencia}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {nota.estoque_status ?? "Não informado"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-lg border border-blue-500 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                        onClick={() =>
                          void abrirDetalhe(nota.id)
                        }
                        type="button"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selecionada ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3 md:p-8">
          <div className="mx-auto max-w-7xl rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <p className="text-sm text-slate-500">
                  NF Recebida
                </p>
                <h2 className="text-xl font-bold">
                  {selecionada.emit_fantasia ??
                    selecionada.emit_nome ??
                    "Emitente não informado"}
                </h2>
                <p className="text-sm text-slate-500">
                  Número {selecionada.numero ?? "N/I"} · Série{" "}
                  {selecionada.serie ?? "N/I"} ·{" "}
                  {money(selecionada.valor_total)}
                </p>
              </div>

              <button
                className="rounded-xl border border-slate-300 px-4 py-2 font-semibold dark:border-slate-700"
                onClick={() => setSelecionada(null)}
                type="button"
              >
                Fechar
              </button>
            </header>

            {carregandoDetalhe ? (
              <div className="p-10 text-center">
                Carregando detalhes...
              </div>
            ) : (
              <div className="space-y-6 p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <SummaryCard
                    label="Conferência"
                    value={
                      statusLabels[
                        selecionada.status_conferencia ??
                          "PENDENTE_CONFERENCIA"
                      ] ??
                      selecionada.status_conferencia ??
                      "Pendente"
                    }
                  />
                  <SummaryCard
                    label="Manifestação"
                    value={
                      selecionada.manifestacao_status ??
                      "Não registrada"
                    }
                  />
                  <SummaryCard
                    label="Estoque"
                    value={
                      selecionada.estoque_status ??
                      "Não movimentado"
                    }
                  />
                  <SummaryCard
                    label="Contas a pagar"
                    value={
                      selecionada.enviado_pagar
                        ? "Enviado"
                        : "Pendente"
                    }
                  />
                </div>

                <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="font-bold">Dados fiscais</h3>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <span className="text-slate-500">
                        Chave
                      </span>
                      <p className="break-all font-medium">
                        {selecionada.chave ?? "Não informada"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">
                        Emitente
                      </span>
                      <p className="font-medium">
                        {selecionada.emit_nome ??
                          "Não informado"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">
                        CNPJ
                      </span>
                      <p className="font-medium">
                        {cnpj(selecionada.emit_cnpj)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">
                        Emissão
                      </span>
                      <p className="font-medium">
                        {dateTime(selecionada.data_emissao)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="font-bold">
                    Itens da nota
                  </h3>

                  {(selecionada.fin_notas_recebidas_itens ??
                    []).length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      A nota não possui itens detalhados.
                    </p>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 text-left dark:bg-slate-900">
                          <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Qtd.</th>
                            <th className="px-3 py-2">
                              Qtd. conferida
                            </th>
                            <th className="px-3 py-2">
                              Produto ID
                            </th>
                            <th className="px-3 py-2">
                              Unidade
                            </th>
                            <th className="px-3 py-2">
                              Fator
                            </th>
                            <th className="px-3 py-2">
                              Estoque
                            </th>
                            <th className="px-3 py-2">
                              Divergência
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selecionada
                            .fin_notas_recebidas_itens ??
                            []).map((item) => {
                            const edit =
                              itensConferencia.find(
                                (candidate) =>
                                  candidate.itemId === item.id,
                              ) ??
                              inicializarItens({
                                ...selecionada,
                                fin_notas_recebidas_itens: [
                                  item,
                                ],
                              })[0];

                            return (
                              <tr
                                key={item.id}
                                className="border-t border-slate-200 dark:border-slate-800"
                              >
                                <td className="px-3 py-2">
                                  <b>
                                    {item.descricao ??
                                      item.codigo ??
                                      `Item ${item.id}`}
                                  </b>
                                  <div className="text-xs text-slate-500">
                                    NCM {item.ncm ?? "N/I"} ·
                                    CFOP {item.cfop ?? "N/I"}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  {text(item.quantidade)}
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    className="w-28 rounded-lg border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
                                    type="number"
                                    step="any"
                                    value={
                                      edit?.quantidadeConferida ??
                                      ""
                                    }
                                    onChange={(event) =>
                                      atualizarItem(item.id, {
                                        quantidadeConferida:
                                          event.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    className="w-32 rounded-lg border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
                                    value={
                                      edit?.produtoId ?? ""
                                    }
                                    onChange={(event) =>
                                      atualizarItem(item.id, {
                                        produtoId:
                                          event.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    className="w-24 rounded-lg border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
                                    value={
                                      edit?.unidadeEstoque ??
                                      ""
                                    }
                                    onChange={(event) =>
                                      atualizarItem(item.id, {
                                        unidadeEstoque:
                                          event.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    className="w-20 rounded-lg border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
                                    type="number"
                                    min="0.000001"
                                    step="any"
                                    value={
                                      edit?.fatorConversao ??
                                      "1"
                                    }
                                    onChange={(event) =>
                                      atualizarItem(item.id, {
                                        fatorConversao:
                                          event.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(
                                        edit?.movimentaEstoque,
                                      )}
                                      onChange={(event) =>
                                        atualizarItem(item.id, {
                                          movimentaEstoque:
                                            event.target.checked,
                                        })
                                      }
                                    />
                                    Movimentar
                                  </label>
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    className="min-w-48 rounded-lg border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
                                    value={
                                      edit?.divergencia ?? ""
                                    }
                                    onChange={(event) =>
                                      atualizarItem(item.id, {
                                        divergencia:
                                          event.target.value,
                                      })
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <form
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                  onSubmit={(event) =>
                    void enviarConferencia(event)
                  }
                >
                  <h3 className="font-bold">Conferência</h3>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-1">
                      <span className="text-sm">
                        Resultado
                      </span>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={statusConferencia}
                        onChange={(event) =>
                          setStatusConferencia(
                            event.target
                              .value as StatusConferencia,
                          )
                        }
                      >
                        <option value="EM_CONFERENCIA">
                          Em conferência
                        </option>
                        <option value="ACEITA">Aceita</option>
                        <option value="RECUSADA">
                          Recusada
                        </option>
                        <option value="DIVERGENTE">
                          Divergente
                        </option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-sm">
                        Fornecedor ID
                      </span>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={fornecedorId}
                        onChange={(event) =>
                          setFornecedorId(event.target.value)
                        }
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-sm">
                        Pedido de compra ID
                      </span>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={pedidoId}
                        onChange={(event) =>
                          setPedidoId(event.target.value)
                        }
                      />
                    </label>

                    <div className="flex items-end">
                      <button
                        className="w-full rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={
                          executando ||
                          selecionada.status_conferencia ===
                            "CANCELADA"
                        }
                        type="submit"
                      >
                        Salvar conferência
                      </button>
                    </div>
                  </div>

                  {statusConferencia === "RECUSADA" ? (
                    <label className="mt-3 block space-y-1">
                      <span className="text-sm">
                        Motivo da recusa
                      </span>
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={motivoRecusa}
                        onChange={(event) =>
                          setMotivoRecusa(event.target.value)
                        }
                      />
                    </label>
                  ) : null}

                  {statusConferencia === "DIVERGENTE" ? (
                    <label className="mt-3 block space-y-1">
                      <span className="text-sm">
                        Descrição da divergência
                      </span>
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={divergenciaObs}
                        onChange={(event) =>
                          setDivergenciaObs(event.target.value)
                        }
                      />
                    </label>
                  ) : null}
                </form>

                <div className="grid gap-4 xl:grid-cols-3">
                  <form
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                    onSubmit={(event) =>
                      void enviarManifestacao(event)
                    }
                  >
                    <h3 className="font-bold">
                      Manifestação fiscal
                    </h3>

                    <label className="mt-3 block space-y-1">
                      <span className="text-sm">Tipo</span>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={manifestacaoTipo}
                        onChange={(event) =>
                          setManifestacaoTipo(
                            event.target
                              .value as ManifestacaoTipo,
                          )
                        }
                      >
                        <option value="CIENCIA">
                          Ciência
                        </option>
                        <option value="CONFIRMACAO">
                          Confirmação
                        </option>
                        <option value="DESCONHECIMENTO">
                          Desconhecimento
                        </option>
                        <option value="NAO_REALIZADA">
                          Operação não realizada
                        </option>
                      </select>
                    </label>

                    <label className="mt-3 block space-y-1">
                      <span className="text-sm">
                        Protocolo, se já transmitido
                      </span>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={manifestacaoProtocolo}
                        onChange={(event) =>
                          setManifestacaoProtocolo(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label className="mt-3 block space-y-1">
                      <span className="text-sm">Descrição</span>
                      <textarea
                        className="min-h-20 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={manifestacaoDescricao}
                        onChange={(event) =>
                          setManifestacaoDescricao(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <button
                      className="mt-3 w-full rounded-xl border border-blue-500 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-300 dark:hover:bg-blue-950/40"
                      disabled={
                        executando || !selecionada.chave
                      }
                      type="submit"
                    >
                      Registrar manifestação
                    </button>
                  </form>

                  <form
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                    onSubmit={(event) =>
                      void movimentarEstoque(event)
                    }
                  >
                    <h3 className="font-bold">
                      Entrada em estoque
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Disponível somente para nota aceita e com
                      produtos vinculados.
                    </p>

                    <label className="mt-3 block space-y-1">
                      <span className="text-sm">
                        Local de estoque ID
                      </span>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={localEstoqueId}
                        onChange={(event) =>
                          setLocalEstoqueId(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label className="mt-3 block space-y-1">
                      <span className="text-sm">
                        Observação
                      </span>
                      <textarea
                        className="min-h-20 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        value={observacaoEstoque}
                        onChange={(event) =>
                          setObservacaoEstoque(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <button
                      className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      disabled={
                        executando ||
                        selecionada.status_conferencia !==
                          "ACEITA" ||
                        selecionada.estoque_status ===
                          "MOVIMENTADO"
                      }
                      type="submit"
                    >
                      Registrar entrada
                    </button>
                  </form>

                  <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="font-bold">
                      Contas a pagar
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Gera os títulos a partir das parcelas da nota.
                    </p>

                    <div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-900">
                      Parcelas:{" "}
                      <b>
                        {
                          (
                            selecionada.fin_notas_recebidas_parcelas ??
                            []
                          ).length
                        }
                      </b>
                    </div>

                    <button
                      className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                      disabled={
                        executando ||
                        selecionada.status_conferencia !==
                          "ACEITA" ||
                        Boolean(selecionada.enviado_pagar)
                      }
                      onClick={() =>
                        void enviarContasPagar()
                      }
                      type="button"
                    >
                      {selecionada.enviado_pagar
                        ? "Já enviado"
                        : "Enviar para Contas a Pagar"}
                    </button>
                  </section>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="font-bold">Parcelas</h3>
                    <div className="mt-3 space-y-2">
                      {(selecionada
                        .fin_notas_recebidas_parcelas ??
                        []).length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nenhuma parcela registrada.
                        </p>
                      ) : (
                        (
                          selecionada.fin_notas_recebidas_parcelas ??
                          []
                        ).map((parcela) => (
                          <div
                            key={parcela.id}
                            className="flex justify-between gap-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-900"
                          >
                            <div>
                              <b>
                                Parcela{" "}
                                {parcela.numero ?? parcela.id}
                              </b>
                              <div className="text-slate-500">
                                Vencimento{" "}
                                {dateOnly(parcela.vencimento)}
                              </div>
                            </div>
                            <b>{money(parcela.valor)}</b>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="font-bold">
                      Histórico de eventos
                    </h3>
                    <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                      {(selecionada.p5_eventos ?? [])
                        .length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nenhum evento registrado.
                        </p>
                      ) : (
                        (selecionada.p5_eventos ?? []).map(
                          (evento) => (
                            <div
                              key={evento.id}
                              className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
                            >
                              <div className="flex flex-wrap justify-between gap-2">
                                <b>
                                  {evento.tipo ?? "Evento"}
                                </b>
                                <span className="text-slate-500">
                                  {dateTime(
                                    evento.criado_em,
                                  )}
                                </span>
                              </div>
                              <p className="mt-1">
                                {evento.descricao ??
                                  "Sem descrição"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Usuário:{" "}
                                {evento.usuario_nome ??
                                  "Não informado"}
                              </p>
                            </div>
                          ),
                        )
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
