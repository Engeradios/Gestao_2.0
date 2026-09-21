"use client";

import { FormEvent, useEffect, useState } from "react";

type Scalar = string | number | boolean | null | undefined;
type FormValue = Record<string, Scalar>;

type EditorModal = {
  type: "servico" | "andamento" | "cliente" | "lista" | "notificacao";
  value: FormValue;
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

function date(value: Scalar): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function inputValue(
  value: Scalar,
): string | number | readonly string[] | undefined {
  if (typeof value === "boolean" || value === null) return "";
  return value;
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch("/api/operacional/" + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : {};

  if (!response.ok) {
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message || "Falha na operação",
    );
  }

  return body;
}

export function ServiceEditorModal({
  modal,
  close,
  done,
}: {
  modal: EditorModal;
  close: () => void;
  done: () => void;
}) {
  const [v, setV] = useState<FormValue>(modal.value),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const set = (k: string, x: Scalar) =>
    setV((current) => ({ ...current, [k]: x }));

  useEffect(() => {
    if (modal.type !== "andamento") return;

    const timer = window.setTimeout(() => {
      void fetch("/api/operacional/listas?tipo=status", {
        cache: "no-store",
      })
        .then((response) => response.json())
        .then((data) => {
          const list = (Array.isArray(data) ? data : []) as Array<{
            nome?: string;
          }>;

          setStatuses(
            list.map((item) => String(item.nome ?? "")).filter(Boolean),
          );
        })
        .catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [modal.type]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      let path = "",
        method = "POST";
      if (modal.type === "servico") {
        path = v.id ? "servicos/" + v.id : "servicos";
        method = v.id ? "PATCH" : "POST";
      }
      if (modal.type === "cliente") {
        path = v.id ? "clientes/" + v.id : "clientes";
        method = v.id ? "PATCH" : "POST";
      }
      if (modal.type === "andamento")
        path = `servicos/${v.servicoId}/andamentos`;
      if (modal.type === "lista") path = "listas";
      if (modal.type === "notificacao") path = "notificacoes";
      const body = { ...v };
      delete body.id;
      delete body.clienteCadastro;
      delete body.andamentos;
      delete body.historicos;
      delete body.emails;
      delete body.servicoId;
      for (const k of Object.keys(body)) if (body[k] === "") body[k] = null;
      await api(path, { method, body: JSON.stringify(body) });
      done();
    } catch (error: unknown) {
      setErr(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950"
      >
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-bold capitalize">{modal.type}</h2>
          <button type="button" onClick={close}>
            ✕
          </button>
        </div>
        {err && (
          <div className="mb-3 rounded-xl bg-red-50 p-3 text-red-700">
            {err}
          </div>
        )}
        {modal.type === "servico" && <ServiceFields v={v} set={set} />}{" "}
        {modal.type === "cliente" && <ClientFields v={v} set={set} />}{" "}
        {modal.type === "andamento" && (
          <div className="grid gap-4">
            <Field
              label="Descrição"
              value={v.descricao}
              set={(x) => set("descricao", x)}
              area
              required
            />
            <Field
              label="Percentual (0 a 1)"
              type="number"
              value={v.percentual}
              set={(x) => set("percentual", Number(x))}
            />
            <label className="block text-sm font-medium">
              Situação
              <select
                value={String(v.status ?? "")}
                onChange={(e) => set("status", e.target.value)}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="">Selecione</option>
                {statuses.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}{" "}
        {modal.type === "lista" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Tipo"
              value={v.tipo}
              set={(x) => set("tipo", x)}
              required
            />
            <Field
              label="Nome"
              value={v.nome}
              set={(x) => set("nome", x)}
              required
            />
            <Field
              label="Ordem"
              type="number"
              value={v.ordem}
              set={(x) => set("ordem", Number(x))}
            />
            <Field label="Cor" value={v.cor} set={(x) => set("cor", x)} />
            <Field
              label="Unidade"
              value={v.unidade}
              set={(x) => set("unidade", x)}
            />
            <Field
              label="Função"
              value={v.funcao}
              set={(x) => set("funcao", x)}
            />
          </div>
        )}{" "}
        {modal.type === "notificacao" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome" value={v.nome} set={(x) => set("nome", x)} />
            <Field
              label="E-mail"
              type="email"
              value={v.email}
              set={(x) => set("email", x)}
              required
            />
            <Check
              label="Recebe abertura"
              value={v.recAbertura}
              set={(x) => set("recAbertura", x)}
            />
            <Check
              label="Recebe faturamento"
              value={v.recFaturamento}
              set={(x) => set("recFaturamento", x)}
            />
            <Check
              label="Recebe logística"
              value={v.recLogistica}
              set={(x) => set("recLogistica", x)}
            />
            <Check label="Ativo" value={v.ativo} set={(x) => set("ativo", x)} />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-xl border px-4 py-2"
          >
            Cancelar
          </button>
          <button
            disabled={busy}
            className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white"
          >
            {busy ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
function ServiceFields({
  v,
  set,
}: {
  v: FormValue;
  set: (k: string, x: Scalar) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Field
        label="Proposta"
        value={v.proposta}
        set={(x) => set("proposta", x)}
      />
      <Field
        label="Cliente"
        value={v.cliente}
        set={(x) => set("cliente", x)}
        required
      />
      <Field
        label="Local"
        value={v.clienteLocal}
        set={(x) => set("clienteLocal", x)}
      />
      <Field
        label="Data aprovação"
        type="date"
        value={date(v.dataAprovacao)}
        set={(x) => set("dataAprovacao", x)}
      />
      <Field
        label="Tipo proposta"
        value={v.tipoProposta}
        set={(x) => set("tipoProposta", x)}
      />
      <Field
        label="UF execução"
        value={v.ufExecucao}
        set={(x) => set("ufExecucao", x)}
      />
      <div className="md:col-span-3">
        <Field
          label="Serviço / atividade"
          value={v.servicoAtividade}
          set={(x) => set("servicoAtividade", x)}
          area
          required
        />
      </div>
      <Field
        label="Categoria"
        value={v.categoria}
        set={(x) => set("categoria", x)}
      />
      <Field
        label="Responsável"
        value={v.responsavel}
        set={(x) => set("responsavel", x)}
      />
      <Field
        label="Prioridade"
        value={v.prioridade}
        set={(x) => set("prioridade", x)}
      />
      <Field
        label="Início planejado"
        type="date"
        value={date(v.inicioPlanejado)}
        set={(x) => set("inicioPlanejado", x)}
      />
      <Field
        label="Prazo final"
        type="date"
        value={date(v.prazoFinal)}
        set={(x) => set("prazoFinal", x)}
      />
      <Field label="Status" value={v.status} set={(x) => set("status", x)} />
      <Field
        label="Início real"
        type="date"
        value={date(v.inicioReal)}
        set={(x) => set("inicioReal", x)}
      />
      <Field
        label="Conclusão real"
        type="date"
        value={date(v.conclusaoReal)}
        set={(x) => set("conclusaoReal", x)}
      />
      <Field
        label="Percentual (0 a 1)"
        type="number"
        value={v.percentual}
        set={(x) => set("percentual", Number(x))}
      />
      <div className="md:col-span-3">
        <Field
          label="Próxima ação"
          value={v.proximaAcao}
          set={(x) => set("proximaAcao", x)}
          area
        />
        <Field
          label="Última situação"
          value={v.ultimaSituacao}
          set={(x) => set("ultimaSituacao", x)}
          area
        />
        <Field
          label="Observações"
          value={v.observacoes}
          set={(x) => set("observacoes", x)}
          area
        />
      </div>
    </div>
  );
}
function ClientFields({
  v,
  set,
}: {
  v: FormValue;
  set: (k: string, x: Scalar) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Field
        label="Código"
        type="number"
        value={v.codigo}
        set={(x) => set("codigo", x ? Number(x) : null)}
      />
      <Field
        label="Razão social"
        value={v.razaoSocial}
        set={(x) => set("razaoSocial", x)}
        required
      />
      <Field
        label="Fantasia"
        value={v.nomeFantasia}
        set={(x) => set("nomeFantasia", x)}
      />
      <Field label="CNPJ" value={v.cnpj} set={(x) => set("cnpj", x)} />
      <Field
        label="Endereço"
        value={v.endereco}
        set={(x) => set("endereco", x)}
      />
      <Field label="Bairro" value={v.bairro} set={(x) => set("bairro", x)} />
      <Field
        label="Município"
        value={v.municipio}
        set={(x) => set("municipio", x)}
      />
      <Field label="UF" value={v.uf} set={(x) => set("uf", x)} />
      <Field label="CEP" value={v.cep} set={(x) => set("cep", x)} />
      <Field
        label="Contato"
        value={v.contatoNome}
        set={(x) => set("contatoNome", x)}
      />
      <Field
        label="E-mail"
        type="email"
        value={v.contatoEmail}
        set={(x) => set("contatoEmail", x)}
      />
      <Field
        label="Telefone"
        value={v.contatoFone}
        set={(x) => set("contatoFone", x)}
      />
      <Field label="Website" value={v.website} set={(x) => set("website", x)} />
      <Check label="Ativo" value={v.ativo} set={(x) => set("ativo", x)} />
    </div>
  );
}
function Field({
  label,
  value,
  set,
  type = "text",
  area = false,
  required = false,
}: {
  label: string;
  value: Scalar;
  set: (x: string) => void;
  type?: string;
  area?: boolean;
  required?: boolean;
}) {
  const cls =
    "mt-1 w-full rounded-xl border bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900";
  return (
    <label className="block text-sm font-medium">
      {label}
      {area ? (
        <textarea
          required={required}
          value={inputValue(value)}
          onChange={(e) => set(e.target.value)}
          rows={3}
          className={cls}
        />
      ) : (
        <input
          required={required}
          type={type}
          step={type === "number" ? "any" : undefined}
          value={inputValue(value)}
          onChange={(e) => set(e.target.value)}
          className={cls}
        />
      )}
    </label>
  );
}
function Check({
  label,
  value,
  set,
}: {
  label: string;
  value: Scalar;
  set: (x: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border p-3">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => set(e.target.checked)}
      />
      {label}
    </label>
  );
}
