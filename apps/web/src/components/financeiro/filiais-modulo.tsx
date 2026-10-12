"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Building2,
  ClipboardList,
  History,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { FiliaisCertificadosPanel } from "@/components/financeiro/filiais-certificados-panel";

type Registro = Record<string, unknown>;
type Aba = "cadastro" | "certificados";

type Form = {
  codigo: string;
  nome: string;
  tipoEstabelecimento: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  ativo: boolean;
};
type CampoTexto = Exclude<keyof Form, "ativo">;

const VAZIO: Form = {
  codigo: "",
  nome: "",
  tipoEstabelecimento: "FILIAL",
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  ativo: true,
};

const SNAKE: Partial<Record<CampoTexto, string>> = {
  tipoEstabelecimento: "tipo_estabelecimento",
  razaoSocial: "razao_social",
  nomeFantasia: "nome_fantasia",
  inscricaoEstadual: "inscricao_estadual",
  inscricaoMunicipal: "inscricao_municipal",
};

const LIMITE: Record<CampoTexto, number> = {
  codigo: 40,
  nome: 120,
  tipoEstabelecimento: 10,
  cnpj: 18,
  razaoSocial: 180,
  nomeFantasia: 180,
  inscricaoEstadual: 30,
  inscricaoMunicipal: 30,
  cep: 9,
  logradouro: 180,
  numero: 20,
  complemento: 100,
  bairro: 100,
  cidade: 100,
  uf: 2,
};

function digitos(v: string): string {
  return v.replace(/\D/g, "");
}

function ler(o: Registro | null | undefined, campo: CampoTexto): string {
  if (!o) return "";
  const nomes = [campo, SNAKE[campo]].filter((n): n is string => typeof n === "string");
  for (const n of nomes) {
    const v = o[n];
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}

function ativoDe(o: Registro): boolean {
  return typeof o.ativo === "boolean" ? o.ativo : true;
}

function mascaraCnpj(v: string): string {
  const d = digitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function mascaraCep(v: string): string {
  const d = digitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function formDe(f: Registro): Form {
  const novo: Form = { ...VAZIO, ativo: ativoDe(f) };
  (Object.keys(LIMITE) as CampoTexto[]).forEach((c) => {
    novo[c] = ler(f, c);
  });
  novo.cnpj = mascaraCnpj(novo.cnpj);
  novo.cep = mascaraCep(novo.cep);
  novo.tipoEstabelecimento = novo.tipoEstabelecimento || "FILIAL";
  return novo;
}

async function mensagemDe(r: Response): Promise<string> {
  const corpo: unknown = await r.json().catch(() => null);
  if (corpo && typeof corpo === "object" && "message" in corpo) {
    const m = (corpo as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(" ");
    if (typeof m === "string") return m;
  }
  return `Falha na operação (HTTP ${r.status}).`;
}

function validar(f: Form, edicao: boolean): string | null {
  if (!edicao && !f.codigo.trim()) return "Informe o código da filial.";
  if (!f.nome.trim()) return "Informe o nome operacional.";
  const cnpj = digitos(f.cnpj);
  if (cnpj && cnpj.length !== 14) return "O CNPJ deve ter 14 dígitos.";
  const cep = digitos(f.cep);
  if (cep && cep.length !== 8) return "O CEP deve ter 8 dígitos.";
  if (f.uf.trim() && f.uf.trim().length !== 2) return "A UF deve ter 2 letras.";
  return null;
}

function payload(f: Form, edicao: boolean): Registro {
  const corpo: Registro = { ativo: f.ativo, tipoEstabelecimento: f.tipoEstabelecimento };
  (Object.keys(LIMITE) as CampoTexto[]).forEach((c) => {
    if (c === "tipoEstabelecimento") return;
    if (edicao && c === "codigo") return;
    let v = f[c].trim();
    if (c === "cnpj" || c === "cep") v = digitos(v);
    if (c === "uf") v = v.toUpperCase();
    if (v) corpo[c] = v;
  });
  return corpo;
}

function Indicador({ titulo, valor, cor }: { titulo: string; valor: number | string; cor: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-0.5 text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

function Campo({
  rotulo,
  obrigatorio,
  children,
  largura = "",
}: {
  rotulo: string;
  obrigatorio?: boolean;
  children: ReactNode;
  largura?: string;
}) {
  return (
    <label className={`block text-sm ${largura}`}>
      <span className="font-medium text-slate-700 dark:text-slate-300">
        {rotulo} {obrigatorio && <span className="text-red-600">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const ENTRADA =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900";

function Secao({ titulo, icone, children }: { titulo: string; icone: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        {icone}
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

function Historico({ filialId }: { filialId: string }) {
  const [itens, setItens] = useState<Registro[] | null>(null);
  useEffect(() => {
    fetch(`/api/financeiro/filiais/${filialId}/historico`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: unknown) => setItens(Array.isArray(d) ? (d as Registro[]) : []))
      .catch(() => setItens([]));
  }, [filialId]);

  if (itens === null) return <p className="text-sm text-slate-500">Carregando histórico...</p>;
  if (itens.length === 0) return <p className="text-sm text-slate-500">Sem alterações registradas.</p>;
  return (
    <ol className="space-y-2">
      {itens.slice(0, 15).map((h, i) => {
        const quando = typeof h.criadoEm === "string" ? h.criadoEm : typeof h.criado_em === "string" ? h.criado_em : "";
        const data = quando ? new Date(quando) : null;
        return (
          <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
            <span className="font-medium">{typeof h.acao === "string" ? h.acao : "ALTERACAO"}</span>
            <span className="text-xs text-slate-500">
              {data && !Number.isNaN(data.getTime()) ? data.toLocaleString("pt-BR") : "—"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PainelFilial({
  filial,
  onFechar,
  onSalvo,
}: {
  filial: Registro | null;
  onFechar: () => void;
  onSalvo: (msg: string) => void;
}) {
  const edicao = filial !== null;
  const id = filial ? String(filial.id) : "";
  const [form, setForm] = useState<Form>(filial ? formDe(filial) : VAZIO);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [consultando, setConsultando] = useState<"" | "cnpj" | "cep">("");

  function atualizar(campo: CampoTexto, valor: string) {
    setForm((f) => {
      const n: Form = { ...f };
      n[campo] = valor.slice(0, LIMITE[campo]);
      return n;
    });
  }

  function preencher(dados: Registro, campos: CampoTexto[]) {
    setForm((f) => {
      const n: Form = { ...f };
      campos.forEach((c) => {
        const v = ler(dados, c);
        if (!v) return;
        n[c] = c === "cep" ? mascaraCep(v) : c === "uf" ? v.toUpperCase().slice(0, 2) : v.slice(0, LIMITE[c]);
      });
      return n;
    });
  }

  async function consultarCnpj() {
    const cnpj = digitos(form.cnpj);
    if (cnpj.length !== 14) return setErro("Informe um CNPJ com 14 dígitos para consultar.");
    setErro("");
    setAviso("");
    setConsultando("cnpj");
    try {
      const r = await fetch(`/api/financeiro/filiais/consulta/cnpj/${cnpj}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await mensagemDe(r));
      preencher((await r.json()) as Registro, [
        "razaoSocial",
        "nomeFantasia",
        "inscricaoEstadual",
        "cep",
        "logradouro",
        "numero",
        "complemento",
        "bairro",
        "cidade",
        "uf",
      ]);
      setAviso("Dados preenchidos a partir da consulta. Revise antes de salvar.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na consulta do CNPJ.");
    } finally {
      setConsultando("");
    }
  }

  async function consultarCep() {
    const cep = digitos(form.cep);
    if (cep.length !== 8) return setErro("Informe um CEP com 8 dígitos para buscar.");
    setErro("");
    setAviso("");
    setConsultando("cep");
    try {
      const r = await fetch(`/api/financeiro/filiais/consulta/cep/${cep}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await mensagemDe(r));
      preencher((await r.json()) as Registro, ["logradouro", "bairro", "cidade", "uf"]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na consulta do CEP.");
    } finally {
      setConsultando("");
    }
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    const problema = validar(form, edicao);
    if (problema) return setErro(problema);
    setErro("");
    setSalvando(true);
    try {
      const r = await fetch(edicao ? `/api/financeiro/filiais/${id}` : "/api/financeiro/filiais", {
        method: edicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(form, edicao)),
      });
      if (!r.ok) throw new Error(await mensagemDe(r));
      onSalvo(edicao ? "Filial atualizada com sucesso." : "Filial cadastrada com sucesso.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar a filial.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" data-f5b5="filial-painel" onClick={onFechar}>
      <form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-950"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold">{edicao ? "Editar filial" : "Nova filial"}</h3>
            <p className="text-xs text-slate-500">Campos marcados com * são obrigatórios.</p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <Secao titulo="Identificação" icone={<Building2 size={15} />}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo rotulo="Código" obrigatorio={!edicao}>
                <input
                  className={ENTRADA}
                  value={form.codigo}
                  disabled={edicao}
                  title={edicao ? "O código identifica os arquivos fiscais da filial e não pode ser alterado." : ""}
                  onChange={(e) => atualizar("codigo", e.target.value.toUpperCase())}
                />
              </Campo>
              <Campo rotulo="Nome operacional" obrigatorio largura="sm:col-span-2">
                <input className={ENTRADA} value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} />
              </Campo>
              <Campo rotulo="Tipo">
                <select className={ENTRADA} value={form.tipoEstabelecimento} onChange={(e) => atualizar("tipoEstabelecimento", e.target.value)}>
                  <option value="FILIAL">Filial</option>
                  <option value="MATRIZ">Matriz</option>
                </select>
              </Campo>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  className="h-4 w-4 accent-red-600"
                />
                Filial ativa
              </label>
            </div>
          </Secao>

          <Secao titulo="Dados fiscais" icone={<ShieldCheck size={15} />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="CNPJ" largura="sm:col-span-2">
                <div className="flex gap-2">
                  <input
                    className={ENTRADA}
                    value={form.cnpj}
                    inputMode="numeric"
                    placeholder="00.000.000/0000-00"
                    onChange={(e) => atualizar("cnpj", mascaraCnpj(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => void consultarCnpj()}
                    disabled={consultando !== ""}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  >
                    {consultando === "cnpj" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Consultar
                  </button>
                </div>
              </Campo>
              <Campo rotulo="Razão social" largura="sm:col-span-2">
                <input className={ENTRADA} value={form.razaoSocial} onChange={(e) => atualizar("razaoSocial", e.target.value)} />
              </Campo>
              <Campo rotulo="Nome fantasia" largura="sm:col-span-2">
                <input className={ENTRADA} value={form.nomeFantasia} onChange={(e) => atualizar("nomeFantasia", e.target.value)} />
              </Campo>
              <Campo rotulo="Inscrição estadual">
                <input className={ENTRADA} value={form.inscricaoEstadual} onChange={(e) => atualizar("inscricaoEstadual", e.target.value)} />
              </Campo>
              <Campo rotulo="Inscrição municipal">
                <input className={ENTRADA} value={form.inscricaoMunicipal} onChange={(e) => atualizar("inscricaoMunicipal", e.target.value)} />
              </Campo>
            </div>
          </Secao>

          <Secao titulo="Endereço" icone={<MapPin size={15} />}>
            <div className="grid gap-3 sm:grid-cols-6">
              <Campo rotulo="CEP" largura="sm:col-span-3">
                <div className="flex gap-2">
                  <input
                    className={ENTRADA}
                    value={form.cep}
                    inputMode="numeric"
                    placeholder="00000-000"
                    onChange={(e) => atualizar("cep", mascaraCep(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => void consultarCep()}
                    disabled={consultando !== ""}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  >
                    {consultando === "cep" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Buscar
                  </button>
                </div>
              </Campo>
              <Campo rotulo="Logradouro" largura="sm:col-span-6">
                <input className={ENTRADA} value={form.logradouro} onChange={(e) => atualizar("logradouro", e.target.value)} />
              </Campo>
              <Campo rotulo="Número" largura="sm:col-span-2">
                <input className={ENTRADA} value={form.numero} onChange={(e) => atualizar("numero", e.target.value)} />
              </Campo>
              <Campo rotulo="Complemento" largura="sm:col-span-4">
                <input className={ENTRADA} value={form.complemento} onChange={(e) => atualizar("complemento", e.target.value)} />
              </Campo>
              <Campo rotulo="Bairro" largura="sm:col-span-2">
                <input className={ENTRADA} value={form.bairro} onChange={(e) => atualizar("bairro", e.target.value)} />
              </Campo>
              <Campo rotulo="Cidade" largura="sm:col-span-3">
                <input className={ENTRADA} value={form.cidade} onChange={(e) => atualizar("cidade", e.target.value)} />
              </Campo>
              <Campo rotulo="UF" largura="sm:col-span-1">
                <input className={ENTRADA} value={form.uf} maxLength={2} onChange={(e) => atualizar("uf", e.target.value.toUpperCase())} />
              </Campo>
            </div>
          </Secao>

          {edicao && (
            <Secao titulo="Histórico de alterações" icone={<History size={15} />}>
              <Historico filialId={id} />
            </Secao>
          )}
        </div>

        <footer className="space-y-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          {erro && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{erro}</p>}
          {aviso && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">{aviso}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onFechar} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {salvando && <Loader2 size={15} className="animate-spin" />}
              {edicao ? "Salvar alterações" : "Cadastrar filial"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Cadastro({ filiais, carregando, recarregar }: { filiais: Registro[]; carregando: boolean; recarregar: () => Promise<void> }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todas" | "ativas" | "inativas">("todas");
  const [tipo, setTipo] = useState<"todos" | "MATRIZ" | "FILIAL">("todos");
  const [painel, setPainel] = useState<{ aberto: boolean; filial: Registro | null }>({ aberto: false, filial: null });
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [alterando, setAlterando] = useState("");

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoDigitos = digitos(busca);
    return filiais.filter((f) => {
      const ativa = ativoDe(f);
      if (status === "ativas" && !ativa) return false;
      if (status === "inativas" && ativa) return false;
      if (tipo !== "todos" && (ler(f, "tipoEstabelecimento") || "FILIAL") !== tipo) return false;
      if (!termo) return true;
      const alvo = [ler(f, "nome"), ler(f, "codigo"), ler(f, "razaoSocial"), ler(f, "cidade")].join(" ").toLowerCase();
      return alvo.includes(termo) || (termoDigitos.length > 0 && digitos(ler(f, "cnpj")).includes(termoDigitos));
    });
  }, [filiais, busca, status, tipo]);

  async function alternar(f: Registro) {
    const ativa = ativoDe(f);
    const nome = ler(f, "nome") || ler(f, "codigo");
    if (!window.confirm(`${ativa ? "Inativar" : "Reativar"} a filial ${nome}?`)) return;
    setErro("");
    setMensagem("");
    setAlterando(String(f.id));
    try {
      const r = await fetch(`/api/financeiro/filiais/${String(f.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !ativa }),
      });
      if (!r.ok) throw new Error(await mensagemDe(r));
      await recarregar();
      setMensagem(ativa ? "Filial inativada." : "Filial reativada.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao alterar o status.");
    } finally {
      setAlterando("");
    }
  }

  return (
    <div className="space-y-4" data-f5b5="filiais-cadastro">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, código, CNPJ ou cidade" className={`${ENTRADA} pl-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={`${ENTRADA} w-auto`}>
          <option value="todas">Todas</option>
          <option value="ativas">Ativas</option>
          <option value="inativas">Inativas</option>
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={`${ENTRADA} w-auto`}>
          <option value="todos">Todos os tipos</option>
          <option value="MATRIZ">Matriz</option>
          <option value="FILIAL">Filial</option>
        </select>
        <button
          type="button"
          onClick={() => setPainel({ aberto: true, filial: null })}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          <Plus size={16} /> Nova filial
        </button>
      </div>

      {erro && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{erro}</p>}
      {mensagem && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{mensagem}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800" data-f5b5="filiais-tabela">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3 font-medium">Filial</th>
                <th className="px-5 py-3 font-medium">CNPJ</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Cidade/UF</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {carregando && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500"><Loader2 size={18} className="mx-auto animate-spin" /></td></tr>
              )}
              {!carregando && lista.map((f) => {
                const ativa = ativoDe(f);
                const cidade = ler(f, "cidade");
                const uf = ler(f, "uf");
                return (
                  <tr key={String(f.id)} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="px-5 py-3">
                      <p className="font-semibold">{ler(f, "nome")}</p>
                      <p className="text-xs text-slate-500">{ler(f, "codigo")}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{ler(f, "cnpj") ? mascaraCnpj(ler(f, "cnpj")) : <span className="text-amber-600">Não cadastrado</span>}</td>
                    <td className="px-5 py-3">{(ler(f, "tipoEstabelecimento") || "FILIAL") === "MATRIZ" ? "Matriz" : "Filial"}</td>
                    <td className="px-5 py-3">{cidade || uf ? `${cidade}${uf ? `/${uf}` : ""}` : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ativa ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {ativa ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPainel({ aberto: true, filial: f })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-white dark:border-slate-700 dark:hover:bg-slate-950"
                        >
                          <Pencil size={13} /> Editar
                        </button>
                        <button
                          type="button"
                          disabled={alterando === String(f.id)}
                          onClick={() => void alternar(f)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${ativa ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40"}`}
                        >
                          <Power size={13} /> {ativa ? "Inativar" : "Reativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!carregando && lista.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">Nenhuma filial encontrada com os filtros atuais.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-500">{lista.length} de {filiais.length} filiais exibidas.</p>

      {painel.aberto && (
        <PainelFilial
          key={painel.filial ? String(painel.filial.id) : "nova"}
          filial={painel.filial}
          onFechar={() => setPainel({ aberto: false, filial: null })}
          onSalvo={(msg) => {
            setPainel({ aberto: false, filial: null });
            setMensagem(msg);
            void recarregar();
          }}
        />
      )}
    </div>
  );
}

export function FiliaisModulo() {
  const [aba, setAba] = useState<Aba>("cadastro");
  const [filiais, setFiliais] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(async () => {
    setErro("");
    try {
      const r = await fetch("/api/financeiro/filiais", { cache: "no-store" });
      if (!r.ok) throw new Error(await mensagemDe(r));
      const dados: unknown = await r.json();
      setFiliais(Array.isArray(dados) ? (dados as Registro[]) : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar filiais.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash === "#certificados") setAba("certificados");
    void recarregar();
  }, [recarregar]);

  function trocar(nova: Aba) {
    setAba(nova);
    window.history.replaceState(null, "", nova === "certificados" ? "#certificados" : "#cadastro");
  }

  const ativas = filiais.filter(ativoDe).length;
  const semCnpj = filiais.filter((f) => digitos(ler(f, "cnpj")).length !== 14).length;
  const valor = (n: number) => (carregando ? "—" : n);

  const abas: { id: Aba; rotulo: string; icone: ReactNode }[] = [
    { id: "cadastro", rotulo: "Cadastro de filiais", icone: <ClipboardList size={16} /> },
    { id: "certificados", rotulo: "Certificados A1", icone: <ShieldCheck size={16} /> },
  ];

  return (
    <div className="space-y-6" data-f5b5="filiais-modulo">
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
          <Building2 size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold">Filiais</h1>
          <p className="text-sm text-slate-500">Cadastro dos estabelecimentos e gestão dos certificados digitais A1.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Total de filiais" valor={valor(filiais.length)} cor="text-slate-900 dark:text-slate-100" />
        <Indicador titulo="Ativas" valor={valor(ativas)} cor="text-emerald-600" />
        <Indicador titulo="Inativas" valor={valor(filiais.length - ativas)} cor="text-slate-500" />
        <Indicador titulo="Sem CNPJ" valor={valor(semCnpj)} cor="text-amber-600" />
      </div>

      {erro && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{erro}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <nav className="flex gap-1 border-b border-slate-200 px-3 dark:border-slate-800" role="tablist" data-f5b5="filiais-abas">
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => trocar(a.id)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${aba === a.id ? "border-red-600 text-red-700 dark:text-red-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
            >
              {a.icone}
              {a.rotulo}
            </button>
          ))}
        </nav>
        <div className="p-5">
          {aba === "cadastro" ? (
            <Cadastro filiais={filiais} carregando={carregando} recarregar={recarregar} />
          ) : (
            <FiliaisCertificadosPanel />
          )}
        </div>
      </div>
    </div>
  );
}

export default FiliaisModulo;
