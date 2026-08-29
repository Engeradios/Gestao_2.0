"use client";
import { ContractDetail, type ContractDetailData } from "./contract-detail";
import { ContractCreateDialog } from "./contract-create-dialog";

import { ChevronLeft, ChevronRight, Eye, Plus, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Contract = {
  id: string; codigo: string; titulo: string; tipo?: string | null;
  etapa: string; status: string; vigenciaInicio?: string | null; vigenciaFim?: string | null;
  valorGlobal?: string | number | null; cliente?: { id: string; razaoSocial?: string; nomeFantasia?: string; cnpj?: string };
};
type PageData = { dados?: Contract[]; itens?: Contract[]; paginacao?: { pagina: number; limite: number; total: number; totalPaginas: number }; total?: number; totalPaginas?: number };
type Indicators = Record<string, number | Record<string, number>>;
const etapas=["CADASTRO_INICIAL","MINUTA_EM_ELABORACAO","REVISAO_INTERNA","ENVIADA_AO_CLIENTE","EM_NEGOCIACAO","AJUSTES_SOLICITADOS","APROVADA_INTERNAMENTE","AGUARDANDO_ASSINATURA","EM_ASSINATURA","ASSINADA","CANCELADA"];
const statuses=["RASCUNHO","ATIVO","SUSPENSO","ENCERRADO","RESCINDIDO","CANCELADO"];

function message(v: unknown) { if (v && typeof v === "object" && "message" in v) { const m=(v as {message?:string|string[]}).message; return Array.isArray(m)?m.join(". "):m||"Não foi possível concluir."; } return "Não foi possível concluir."; }
async function json(path:string,init?:RequestInit){ const r=await fetch(path,{cache:"no-store",...init,headers:{"Content-Type":"application/json",...(init?.headers||{})}}); const d:unknown=await r.json().catch(()=>null); if(!r.ok) throw new Error(message(d)); return d; }
const fmtDate=(v?:string|null)=>v?new Date(v).toLocaleDateString("pt-BR"):"—";
const money=(v?:string|number|null)=>v==null?"—":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v));

export function ContractsManager({ canManage, canDocuments }: { canManage: boolean; canDocuments: boolean }){
 const [data,setData]=useState<PageData>({}); const [indicators,setIndicators]=useState<Indicators>({});
 const [query,setQuery]=useState({busca:"",etapa:"",status:"",pagina:1,limite:25});
 const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [detail,setDetail]=useState<ContractDetailData|null>(null);
 const [creating,setCreating]=useState(false);
 const load=useCallback(async()=>{ setLoading(true);setError("");try{const p=new URLSearchParams();Object.entries(query).forEach(([k,v])=>{if(v!=="")p.set(k,String(v));});const [list,stats]=await Promise.all([json(`/api/administrativo/contratos?${p}`),json("/api/administrativo/contratos/indicadores")]);setData(list as PageData);setIndicators(stats as Indicators);}catch(e){setError(e instanceof Error?e.message:"Falha ao carregar contratos.");}finally{setLoading(false);}},[query]);
 useEffect(()=>{const t=window.setTimeout(()=>void load(),query.busca?350:0);return()=>window.clearTimeout(t);},[load,query.busca]);
 async function open(id:string){try{setDetail(await json(`/api/administrativo/contratos/${id}`) as ContractDetailData);}catch(e){setError(e instanceof Error?e.message:"Falha ao abrir contrato.");}}
 function openCreate(){setCreating(true);}
 const items=data.dados||data.itens||[]; const pg=data.paginacao||{pagina:query.pagina,limite:query.limite,total:data.total||0,totalPaginas:data.totalPaginas||1};
 const flat=Object.entries(indicators).filter(([,v])=>typeof v==="number").slice(0,4) as Array<[string,number]>;
 return <section className="space-y-5">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-widest text-red-600">Administrativo</p><h1 className="text-2xl font-bold">Gestão de Contratos</h1><p className="text-sm text-slate-500">Minutas, vigências, clientes e documentos contratuais.</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"><RefreshCw size={16}/>Atualizar</button><button onClick={()=>void openCreate()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"><Plus size={16}/>Novo contrato</button></div></header>
  {flat.length>0&&<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{flat.map(([k,v])=><article key={k} className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><p className="text-xs uppercase text-slate-500">{k}</p><p className="mt-1 text-2xl font-bold">{v}</p></article>)}</div>}
  <div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_220px_180px] dark:border-slate-800 dark:bg-slate-950"><label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input value={query.busca} onChange={e=>setQuery(q=>({...q,busca:e.target.value,pagina:1}))} placeholder="Buscar código, título ou cliente" className="w-full rounded-xl border bg-transparent py-2.5 pl-10 pr-3"/></label><select value={query.etapa} onChange={e=>setQuery(q=>({...q,etapa:e.target.value,pagina:1}))} className="rounded-xl border bg-transparent px-3"><option value="">Todas as etapas</option>{etapas.map(x=><option key={x}>{x}</option>)}</select><select value={query.status} onChange={e=>setQuery(q=>({...q,status:e.target.value,pagina:1}))} className="rounded-xl border bg-transparent px-3"><option value="">Todos os status</option>{statuses.map(x=><option key={x}>{x}</option>)}</select></div>
  {error&&<div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
  <div className="overflow-hidden rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-950"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr>{["Código","Cliente","Título","Etapa","Status","Vigência","Valor",""] .map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y dark:divide-slate-800">{loading?<tr><td colSpan={8} className="p-10 text-center">Carregando...</td></tr>:items.map(c=><tr key={c.id}><td className="px-4 py-3 font-semibold">{c.codigo}</td><td className="px-4 py-3">{c.cliente?.razaoSocial||c.cliente?.nomeFantasia||"—"}</td><td className="px-4 py-3">{c.titulo}</td><td className="px-4 py-3">{c.etapa}</td><td className="px-4 py-3">{c.status}</td><td className="whitespace-nowrap px-4 py-3">{fmtDate(c.vigenciaInicio)} a {fmtDate(c.vigenciaFim)}</td><td className="px-4 py-3">{money(c.valorGlobal)}</td><td className="px-4 py-3"><button onClick={()=>void open(c.id)} aria-label={`Abrir ${c.codigo}`}><Eye size={18}/></button></td></tr>)}{!loading&&!items.length&&<tr><td colSpan={8} className="p-10 text-center text-slate-500">Nenhum contrato encontrado.</td></tr>}</tbody></table></div><footer className="flex items-center justify-between border-t p-4 text-sm"><span>{pg.total} registros · Página {pg.pagina} de {Math.max(pg.totalPaginas,1)}</span><div className="flex gap-2"><button disabled={pg.pagina<=1} onClick={()=>setQuery(q=>({...q,pagina:q.pagina-1}))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft/></button><button disabled={pg.pagina>=pg.totalPaginas} onClick={()=>setQuery(q=>({...q,pagina:q.pagina+1}))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight/></button></div></footer></div>
  {detail && <ContractDetail contract={detail} canManage={canManage} canDocuments={canDocuments} onClose={() => setDetail(null)} onReload={async () => { const refreshed = await json(`/api/administrativo/contratos/${detail.id}`) as ContractDetailData; setDetail(refreshed); await load(); }} />}
  {creating && <ContractCreateDialog onClose={() => setCreating(false)} onCreated={load} />}
 </section>;
}
