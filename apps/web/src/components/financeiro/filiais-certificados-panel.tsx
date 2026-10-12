"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

type Registro = Record<string, unknown>;
type Filial = Registro & { id: string };
type EstadoStatus = Registro | "carregando" | "erro";
type Nivel = "sem" | "carregando" | "erro" | "vencido" | "invalido" | "critico" | "atencao" | "valido";

const MAX_BYTES = 5 * 1024 * 1024;

function definir<T>(mapa: Record<string, T>, chave: string, valor: T): Record<string, T> {
  const copia: Record<string, T> = { ...mapa };
  copia[chave] = valor;
  return copia;
}

function texto(o: Registro | null | undefined, chaves: string[]): string | null {
  if (!o) return null;
  for (const c of chaves) {
    const v = o[c];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function numero(o: Registro | null | undefined, chave: string): number | null {
  const v = o ? o[chave] : undefined;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function logico(o: Registro | null | undefined, chave: string): boolean {
  return o ? o[chave] === true : false;
}

function comoRegistro(e: EstadoStatus | undefined): Registro | null {
  return e && e !== "carregando" && e !== "erro" ? e : null;
}

function nomeFilial(f: Filial): string {
  return texto(f, ["nomeOperacional", "nome", "nomeFantasia", "razaoSocial", "codigo"]) ?? `Filial ${f.id}`;
}

function formatarCnpj(v: string | null): string {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.length !== 14) return v ?? "—";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatarData(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function formatarDataHora(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
}

function nomeComum(dn: string | null): string | null {
  if (!dn) return null;
  const m = /CN=([^,]+)/i.exec(dn);
  return m ? m[1].split(":")[0].trim() : dn;
}

function diasRestantes(st: Registro | null): number | null {
  const d = numero(st, "diasParaVencer");
  if (d !== null) return d;
  const ate = texto(st, ["validoAte"]);
  if (!ate) return null;
  const t = new Date(ate).getTime();
  return Number.isNaN(t) ? null : Math.floor((t - Date.now()) / 86_400_000);
}

function nivelDe(e: EstadoStatus | undefined): Nivel {
  if (e === "carregando") return "carregando";
  if (e === "erro") return "erro";
  if (!e || !logico(e, "instalado")) return "sem";
  const situacao = texto(e, ["situacao"]);
  if (situacao === "INVALIDO" || situacao === "ARQUIVO_AUSENTE" || situacao === "SEGREDO_AUSENTE") return "invalido";
  const dias = diasRestantes(e);
  if (situacao === "EXPIRADO" || (dias !== null && dias < 0)) return "vencido";
  if (dias !== null && dias <= 15) return "critico";
  if (situacao === "PROXIMO_VENCIMENTO" || (dias !== null && dias <= 45)) return "atencao";
  return "valido";
}

const NIVEL: Record<Nivel, { rotulo: string; classe: string }> = {
  sem: { rotulo: "Sem certificado", classe: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  carregando: { rotulo: "Consultando", classe: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
  erro: { rotulo: "Indisponível", classe: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
  vencido: { rotulo: "Vencido", classe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  invalido: { rotulo: "Inválido", classe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  critico: { rotulo: "Vence em breve", classe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  atencao: { rotulo: "Atenção", classe: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  valido: { rotulo: "Válido", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
};

function corDias(n: Nivel): string {
  if (n === "vencido" || n === "critico" || n === "invalido") return "text-red-600 dark:text-red-400";
  if (n === "atencao") return "text-amber-600 dark:text-amber-400";
  if (n === "valido") return "text-emerald-600 dark:text-emerald-400";
  return "text-slate-500";
}

async function mensagemDe(resposta: Response): Promise<string> {
  const corpo: unknown = await resposta.json().catch(() => null);
  if (corpo && typeof corpo === "object" && "message" in corpo) {
    const m = (corpo as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(" ");
    if (typeof m === "string") return m;
  }
  return "Não foi possível concluir a operação.";
}

function Selo({ nivel }: { nivel: Nivel }) {
  const n = NIVEL[nivel];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${n.classe}`}>
      {n.rotulo}
    </span>
  );
}

function Capacidade({ rotulo, ativo, textoAtivo = "Pronto" }: { rotulo: string; ativo: boolean; textoAtivo?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
      <span className="text-sm text-slate-600 dark:text-slate-300">{rotulo}</span>
      <span className={`flex items-center gap-1.5 text-sm font-semibold ${ativo ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
        {ativo ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
        {ativo ? textoAtivo : "Indisponível"}
      </span>
    </div>
  );
}

function Indicador({ titulo, valor, classe }: { titulo: string; valor: number; classe: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold ${classe}`}>{valor}</p>
    </div>
  );
}

function SefazStatus({ filialId }: { filialId: string }) {
  const [dados, setDados] = useState<Registro | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setDados(null);
    setErro("");
  }, [filialId]);

  async function consultar() {
    setCarregando(true);
    setErro("");
    try {
      const r = await fetch(`/api/financeiro/filiais/${filialId}/sefaz/status`, { cache: "no-store" });
      if (!r.ok) throw new Error(await mensagemDe(r));
      setDados((await r.json()) as Registro);
    } catch (e) {
      setDados(null);
      setErro(e instanceof Error ? e.message : "Falha na consulta.");
    } finally {
      setCarregando(false);
    }
  }

  const ok = texto(dados, ["cStat"]) === "107";

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">SEFAZ NF-e</p>
          <p className="text-xs text-slate-500">Ambiente de homologação</p>
        </div>
        <button
          type="button"
          onClick={() => void consultar()}
          disabled={carregando}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          {carregando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Consultar
        </button>
      </div>
      {dados && (
        <div className="mt-3 text-sm">
          <p className={ok ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>
            {ok ? "Serviço em operação" : (texto(dados, ["xMotivo"]) ?? "Status indisponível")}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            cStat {texto(dados, ["cStat"]) ?? "N/D"} · {numero(dados, "tempoMs") ?? "—"} ms · {formatarDataHora(texto(dados, ["consultadoEm"]))}
          </p>
        </div>
      )}
      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
    </div>
  );
}

export function FiliaisCertificadosPanel() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [status, setStatus] = useState<Record<string, EstadoStatus>>({});
  const [selecionada, setSelecionada] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const entradaArquivo = useRef<HTMLInputElement>(null);

  const carregarStatus = useCallback(async (id: string) => {
    setStatus((s) => definir(s, id, "carregando" as EstadoStatus));
    try {
      const r = await fetch(`/api/financeiro/filiais/${id}/certificado`, { cache: "no-store" });
      if (!r.ok) throw new Error(await mensagemDe(r));
      const dados = (await r.json()) as Registro;
      setStatus((s) => definir(s, id, dados as EstadoStatus));
    } catch {
      setStatus((s) => definir(s, id, "erro" as EstadoStatus));
    }
  }, []);

  const carregarTudo = useCallback(async () => {
    setErro("");
    try {
      const r = await fetch("/api/financeiro/filiais", { cache: "no-store" });
      if (!r.ok) throw new Error(await mensagemDe(r));
      const lista = ((await r.json()) as Filial[]).map((f) => ({ ...f, id: String(f.id) }));
      setFiliais(lista);
      setSelecionada((atual) => atual || (lista.length > 0 ? lista[0].id : ""));
      await Promise.all(lista.map((f) => carregarStatus(f.id)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar filiais.");
    }
  }, [carregarStatus]);

  useEffect(() => {
    void carregarTudo();
  }, [carregarTudo]);

  const filial = filiais.find((f) => f.id === selecionada) ?? null;
  const bruto: EstadoStatus | undefined = selecionada ? status[selecionada] : undefined;
  const atual = comoRegistro(bruto);
  const nivelAtual = nivelDe(bruto);
  const instalado = logico(atual, "instalado");

  const indicadores = useMemo(() => {
    const r = { validos: 0, atencao: 0, vencidos: 0, sem: 0 };
    for (const f of filiais) {
      const n = nivelDe(status[f.id]);
      if (n === "valido") r.validos += 1;
      else if (n === "atencao" || n === "critico") r.atencao += 1;
      else if (n === "vencido" || n === "invalido") r.vencidos += 1;
      else if (n === "sem") r.sem += 1;
    }
    return r;
  }, [filiais, status]);

  const progresso = useMemo(() => {
    const ini = new Date(texto(atual, ["validoDesde"]) ?? "").getTime();
    const fim = new Date(texto(atual, ["validoAte"]) ?? "").getTime();
    if (Number.isNaN(ini) || Number.isNaN(fim) || fim <= ini) return null;
    return Math.min(100, Math.max(0, ((Date.now() - ini) / (fim - ini)) * 100));
  }, [atual]);

  const titular = texto(atual, ["titular", "subject"]);
  const mensagem = texto(atual, ["mensagem", "message", "observacao"]);
  const dias = diasRestantes(atual);
  const bytes = numero(atual, "arquivoBytes");

  function limparFormulario() {
    setArquivo(null);
    setSenha("");
    if (entradaArquivo.current) entradaArquivo.current.value = "";
  }

  async function instalar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setSucesso("");
    if (!filial) return setErro("Selecione uma filial.");
    if (!texto(filial, ["cnpj"])) return setErro("Cadastre o CNPJ da filial antes do certificado.");
    if (!arquivo) return setErro("Selecione um arquivo .pfx ou .p12.");
    if (!/\.(pfx|p12)$/i.test(arquivo.name)) return setErro("O arquivo deve possuir extensão .pfx ou .p12.");
    if (arquivo.size > MAX_BYTES) return setErro("O certificado deve ter no máximo 5 MB.");
    if (!senha) return setErro("Informe a senha do certificado.");
    if (
      instalado &&
      !window.confirm(
        "Esta filial já possui certificado. O atual será preservado caso a nova instalação falhe. Deseja substituir?",
      )
    ) {
      return;
    }

    const corpo = new FormData();
    corpo.append("arquivo", arquivo);
    corpo.append("senha", senha);
    setOcupado(true);
    try {
      const r = await fetch(`/api/financeiro/filiais/${filial.id}/certificado`, { method: "POST", body: corpo });
      if (!r.ok) throw new Error(await mensagemDe(r));
      limparFormulario();
      await carregarStatus(filial.id);
      setSucesso("Certificado validado e instalado com segurança.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao instalar certificado.");
    } finally {
      setOcupado(false);
    }
  }

  async function remover() {
    if (!filial || !window.confirm("Remover o certificado desta filial? A operação será auditada.")) return;
    setErro("");
    setSucesso("");
    setOcupado(true);
    try {
      const r = await fetch(`/api/financeiro/filiais/${filial.id}/certificado`, { method: "DELETE" });
      if (!r.ok) throw new Error(await mensagemDe(r));
      limparFormulario();
      await carregarStatus(filial.id);
      setSucesso("Certificado removido com sucesso.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover certificado.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="space-y-6" data-f5b4="certificados-modulo">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h2 className="text-xl font-bold">Certificados digitais A1</h2>
            <p className="text-sm text-slate-500">
              Validade e prontidão fiscal por filial. A senha nunca é exibida novamente.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void carregarTudo()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          <RefreshCw size={15} /> Atualizar
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Válidos" valor={indicadores.validos} classe="text-emerald-600" />
        <Indicador titulo="Vencendo em até 45 dias" valor={indicadores.atencao} classe="text-amber-600" />
        <Indicador titulo="Vencidos ou inválidos" valor={indicadores.vencidos} classe="text-red-600" />
        <Indicador titulo="Sem certificado" valor={indicadores.sem} classe="text-slate-600 dark:text-slate-300" />
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
        data-f5b4="certificados-overview"
      >
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h3 className="font-semibold">Certificados por filial</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3 font-medium">Filial</th>
                <th className="px-5 py-3 font-medium">CNPJ</th>
                <th className="px-5 py-3 font-medium">Situação</th>
                <th className="px-5 py-3 font-medium" data-f5b4="certificado-validade">Válido até</th>
                <th className="px-5 py-3 font-medium">Dias restantes</th>
                <th className="px-5 py-3 font-medium">Prontidão fiscal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filiais.map((f) => {
                const estado = status[f.id];
                const st = comoRegistro(estado);
                const n = nivelDe(estado);
                const d = diasRestantes(st);
                const ativa = f.id === selecionada;
                return (
                  <tr
                    key={f.id}
                    onClick={() => {
                      setSelecionada(f.id);
                      setErro("");
                      setSucesso("");
                    }}
                    className={`cursor-pointer transition-colors ${ativa ? "bg-red-50/70 dark:bg-red-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold">{nomeFilial(f)}</p>
                      <p className="text-xs text-slate-500">{texto(f, ["codigo"]) ?? ""}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{formatarCnpj(texto(f, ["cnpj"]))}</td>
                    <td className="px-5 py-3"><Selo nivel={n} /></td>
                    <td className="px-5 py-3 font-medium">{formatarData(texto(st, ["validoAte"]))}</td>
                    <td className={`px-5 py-3 font-semibold ${corDias(n)}`}>
                      {d === null ? "—" : d >= 0 ? `${d} dias` : `Vencido há ${Math.abs(d)} dias`}
                    </td>
                    <td className="px-5 py-3">
                      {logico(st, "prontoParaUsoFiscal") ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                          <CheckCircle2 size={14} /> Pronto
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filiais.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">Nenhuma filial encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filial && (
        <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <div
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
            data-f5b4="certificado-detalhe"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-slate-400" />
                <div>
                  <p className="font-semibold">{nomeFilial(filial)}</p>
                  <p className="font-mono text-xs text-slate-500">{formatarCnpj(texto(filial, ["cnpj"]))}</p>
                </div>
              </div>
              <Selo nivel={nivelAtual} />
            </div>

            {instalado ? (
              <>
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CalendarClock size={20} className="text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Válido até</p>
                        <p className="text-2xl font-bold">{formatarData(texto(atual, ["validoAte"]))}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Dias restantes</p>
                      <p className={`text-2xl font-bold ${corDias(nivelAtual)}`}>
                        {dias === null ? "—" : dias}
                      </p>
                    </div>
                  </div>
                  {progresso !== null && (
                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${nivelAtual === "valido" ? "bg-emerald-500" : nivelAtual === "atencao" ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-xs text-slate-500">
                        <span>Emitido em {formatarData(texto(atual, ["validoDesde"]))}</span>
                        <span>{Math.round(progresso)}% do período utilizado</span>
                      </div>
                    </div>
                  )}
                </div>

                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500">Titular</dt>
                    <dd className="font-medium">{nomeComum(titular) ?? "—"}</dd>
                    {titular && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-slate-500">Identificação completa</summary>
                        <p className="mt-1 break-all text-xs text-slate-500">{titular}</p>
                      </details>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">CNPJ do certificado</dt>
                    <dd className="font-mono">{formatarCnpj(texto(atual, ["cnpjCertificado"]))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Arquivo</dt>
                    <dd>
                      {bytes !== null ? `${Math.ceil(bytes / 1024)} KB` : "—"}
                      {" · "}
                      {logico(atual, "arquivoPersistido") && logico(atual, "segredoPersistido") ? "senha protegida" : "incompleto"}
                    </dd>
                  </div>
                </dl>

                {mensagem && (
                  <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <span>{mensagem}</span>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <Capacidade rotulo="Prontidão fiscal" ativo={logico(atual, "prontoParaUsoFiscal")} />
                  <Capacidade rotulo="NF Recebidas" ativo={logico(atual, "capacidadeNfeRecebidas")} />
                  <Capacidade rotulo="NF-e Emitidas" ativo={logico(atual, "capacidadeNfeEmitidas")} textoAtivo="Preparado" />
                  <Capacidade rotulo="Consulta SEFAZ" ativo={logico(atual, "capacidadeSefaz")} />
                </div>

                <SefazStatus filialId={filial.id} />

                <p className="text-xs text-slate-500">
                  Status atualizado em {formatarDataHora(texto(atual, ["atualizadoEm"]))}
                </p>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <KeyRound size={28} className="mx-auto text-slate-400" />
                <p className="mt-2 font-medium">Nenhum certificado instalado</p>
                <p className="text-sm text-slate-500">
                  Instale um certificado A1 para habilitar as consultas fiscais desta filial.
                </p>
              </div>
            )}
          </div>

          <form
            onSubmit={instalar}
            className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
            data-f5b4="certificado-upload"
          >
            <div>
              <h3 className="font-semibold">{instalado ? "Substituir certificado" : "Instalar certificado"}</h3>
              <p className="text-xs text-slate-500">
                Arquivo original .pfx ou .p12, com certificado e chave privada. Máximo 5 MB.
              </p>
            </div>

            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-5 text-center transition-colors hover:border-red-400 dark:border-slate-700">
              <Upload size={22} className="mx-auto text-slate-400" />
              <span className="mt-2 block text-sm font-medium">{arquivo ? arquivo.name : "Selecionar arquivo"}</span>
              <span className="block text-xs text-slate-500">
                {arquivo ? `${Math.ceil(arquivo.size / 1024)} KB` : "PFX ou P12"}
              </span>
              <input
                ref={entradaArquivo}
                type="file"
                accept=".pfx,.p12,application/x-pkcs12"
                className="sr-only"
                onChange={(e) => setArquivo(e.target.files && e.target.files.length > 0 ? e.target.files[0] : null)}
              />
            </label>

            <label className="block text-sm">
              Senha do certificado <span className="text-red-600">*</span>
              <input
                type="password"
                value={senha}
                autoComplete="new-password"
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            {erro && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {erro}
              </p>
            )}
            {sucesso && (
              <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {sucesso}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={ocupado}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {instalado ? "Substituir" : "Instalar"}
              </button>
              {instalado && (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void remover()}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={16} /> Remover
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default FiliaisCertificadosPanel;
