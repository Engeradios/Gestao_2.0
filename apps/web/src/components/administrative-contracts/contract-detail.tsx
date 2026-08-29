"use client";
import { Download, FileUp, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";

type Person={nome?:string;email?:string};
type Progress={id:string;etapaAnterior?:string|null;etapaNova:string;descricao:string;pendencia?:string|null;prazo?:string|null;destinatario?:string|null;registradoEm:string;usuario?:Person|null};
type Document={id:string;tipo:string;versao:number;nomeOriginal:string;mimeType:string;tamanhoBytes:string|number;documentoPrincipal:boolean;enviadoEm:string};
type Partner={id:string;nomeSocio?:string|null;documentoMascarado?:string|null;qualificacaoSocio?:string|null;dataEntradaSociedade?:string|null};
type Query={id:string;sucesso:boolean;httpStatus?:number|null;divergencias?:Record<string,{local:unknown;brasilApi:unknown}>|null;erro?:string|null;consultadoEm:string;socios?:Partner[]};
export type ContractDetailData={id:string;codigo:string;titulo:string;tipo?:string|null;etapa:string;status:string;objeto?:string|null;numeroDocumento?:string|null;vigenciaInicio?:string|null;vigenciaFim?:string|null;valorGlobal?:string|number|null;valorMensal?:string|number|null;observacoes?:string|null;cliente?:{razaoSocial?:string;nomeFantasia?:string;cnpj?:string};responsavel?:Person|null;andamentos?:Progress[];documentos?:Document[];consultasCnpj?:Query[]};
const stages=["CADASTRO_INICIAL","MINUTA_EM_ELABORACAO","REVISAO_INTERNA","ENVIADA_AO_CLIENTE","EM_NEGOCIACAO","AJUSTES_SOLICITADOS","APROVADA_INTERNAMENTE","AGUARDANDO_ASSINATURA","EM_ASSINATURA","ASSINADA","CANCELADA"];
const docTypes=["MINUTA","ASSINADO","ADITIVO","ANEXO","CERTIFICADO"];
function msg(v:unknown){if(v&&typeof v==="object"&&"message" in v){const m=(v as {message?:string|string[]}).message;return Array.isArray(m)?m.join(". "):m||"Falha na operação."}return "Falha na operação."}
async function api(path:string,init?:RequestInit){const r=await fetch(path,{cache:"no-store",...init,headers:init?.body instanceof FormData?init.headers:{"Content-Type":"application/json",...(init?.headers||{})}});const d:unknown=await r.json().catch(()=>null);if(!r.ok)throw new Error(msg(d));return d}
const date=(v?:string|null)=>v?new Date(v).toLocaleString("pt-BR"):"—";
export function ContractDetail({contract,onClose,onReload,canManage,canDocuments}:{contract:ContractDetailData;onClose:()=>void;onReload:()=>Promise<void>;canManage:boolean;canDocuments:boolean}){
 const [tab,setTab]=useState("dados"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 // CONTRATO_EDITAR_VIGENCIA
 const [editingDates,setEditingDates]=useState(false);
 const [dates,setDates]=useState({
  vigenciaInicio:contract.vigenciaInicio?.slice(0,10)||"",
  vigenciaFim:contract.vigenciaFim?.slice(0,10)||"",
 });
 const [progress,setProgress]=useState({etapaNova:contract.etapa,descricao:"",pendencia:"",prazo:"",destinatario:""});
 const [file,setFile]=useState<File|null>(null),[docType,setDocType]=useState("ANEXO"),[main,setMain]=useState(false);
 async function action(fn:()=>Promise<void>){setBusy(true);setError("");try{await fn();await onReload()}catch(e){setError(e instanceof Error?e.message:"Falha na operação.")}finally{setBusy(false)}}
 async function saveProgress(e:FormEvent){e.preventDefault();await action(async()=>{await api(`/api/administrativo/contratos/${contract.id}/andamentos`,{method:"POST",body:JSON.stringify({...progress,prazo:progress.prazo||undefined})});setProgress({...progress,descricao:"",pendencia:"",prazo:"",destinatario:""})})}
 async function saveDates(e:FormEvent){
  e.preventDefault();
  setError("");
  if(!dates.vigenciaInicio||!dates.vigenciaFim){setError("Informe o início e o fim da obra.");return}
  if(dates.vigenciaFim<dates.vigenciaInicio){setError("O fim da obra deve ser igual ou posterior ao início.");return}
  await action(async()=>{
   await api(`/api/administrativo/contratos/${contract.id}`,{
    method:"PATCH",
    body:JSON.stringify({
     vigenciaInicio:dates.vigenciaInicio,
     vigenciaFim:dates.vigenciaFim,
    }),
   });
   setEditingDates(false);
  });
 }
 function cancelDates(){
  setDates({
   vigenciaInicio:contract.vigenciaInicio?.slice(0,10)||"",
   vigenciaFim:contract.vigenciaFim?.slice(0,10)||"",
  });
  setEditingDates(false);
  setError("");
 }
 async function consult(){await action(async()=>{await api(`/api/administrativo/contratos/${contract.id}/consultar-cnpj`,{method:"POST"})})}
 async function upload(e:FormEvent){e.preventDefault();if(!file){setError("Selecione um arquivo.");return}await action(async()=>{const form=new FormData();form.append("arquivo",file);form.append("tipo",docType);form.append("documentoPrincipal",String(main));const r=await fetch(`/api/administrativo/contratos/${contract.id}/documentos`,{method:"POST",body:form});const d:unknown=await r.json().catch(()=>null);if(!r.ok)throw new Error(msg(d));setFile(null)})}
 async function removeDoc(id:string){if(!confirm("Confirma a exclusão lógica do documento?"))return;await action(async()=>{await api(`/api/administrativo/contratos/${contract.id}/documentos/${id}`,{method:"DELETE",body:JSON.stringify({motivo:"Exclusão solicitada pela interface"})})})}
 async function download(doc:Document){const r=await fetch(`/api/administrativo/contratos/${contract.id}/documentos/${doc.id}/download`);if(!r.ok){throw new Error("Falha no download.")}const url=URL.createObjectURL(await r.blob());const a=document.createElement("a");a.href=url;a.download=doc.nomeOriginal;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
 const tabs=[["dados","Dados"],["andamentos","Andamentos"],["brasilapi","BrasilAPI / QSA"],["documentos","Documentos"]];
 return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[94vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-950"><header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white p-5 dark:border-slate-800 dark:bg-slate-950"><div><p className="text-sm font-semibold text-red-600">{contract.codigo}</p><h2 className="text-xl font-bold">{contract.titulo}</h2><p className="text-sm text-slate-500">{contract.cliente?.razaoSocial||"Cliente não informado"}</p></div><button onClick={onClose} aria-label="Fechar"><X/></button></header><nav className="flex gap-2 overflow-x-auto border-b px-5 pt-3 dark:border-slate-800">{tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${tab===id?"border-red-600 text-red-600":"border-transparent text-slate-500"}`}>{label}</button>)}</nav><main className="space-y-5 p-5">{error&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}
 {tab==="dados"&&<div className="space-y-4">
  <div className="flex justify-end">
   {canManage&&!editingDates&&<button type="button" onClick={()=>setEditingDates(true)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><Pencil size={16}/>Editar início e fim da obra</button>}
  </div>
  {editingDates?<form onSubmit={saveDates} className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2">
   <label className="text-sm font-semibold">Início da obra<input type="date" required value={dates.vigenciaInicio} onChange={e=>setDates(current=>({...current,vigenciaInicio:e.target.value}))} className="mt-2 w-full rounded-xl border bg-transparent p-3"/></label>
   <label className="text-sm font-semibold">Fim da obra<input type="date" required min={dates.vigenciaInicio||undefined} value={dates.vigenciaFim} onChange={e=>setDates(current=>({...current,vigenciaFim:e.target.value}))} className="mt-2 w-full rounded-xl border bg-transparent p-3"/></label>
   <div className="flex gap-2 md:col-span-2 md:justify-end">
    <button type="button" disabled={busy} onClick={cancelDates} className="rounded-xl border px-4 py-2 font-semibold">Cancelar</button>
    <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"><Save size={16}/>{busy?"Salvando...":"Salvar vigência"}</button>
   </div>
  </form>:<div className="grid gap-4 md:grid-cols-3"><Info label="Etapa" value={contract.etapa}/><Info label="Status" value={contract.status}/><Info label="Tipo" value={contract.tipo}/><Info label="CNPJ" value={contract.cliente?.cnpj}/><Info label="Documento" value={contract.numeroDocumento}/><Info label="Responsável" value={contract.responsavel?.nome}/><Info label="Início da obra" value={date(contract.vigenciaInicio)}/><Info label="Fim da obra" value={date(contract.vigenciaFim)}/><Info label="Objeto" value={contract.objeto}/></div>}
 </div>}
 {tab==="andamentos"&&<div className="space-y-4">{canManage&&<form onSubmit={saveProgress} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-2"><select value={progress.etapaNova} onChange={e=>setProgress(p=>({...p,etapaNova:e.target.value}))} className="rounded-xl border bg-transparent p-3">{stages.map(x=><option key={x}>{x}</option>)}</select><input required maxLength={5000} value={progress.descricao} onChange={e=>setProgress(p=>({...p,descricao:e.target.value}))} placeholder="Descrição do andamento" className="rounded-xl border p-3"/><input value={progress.pendencia} onChange={e=>setProgress(p=>({...p,pendencia:e.target.value}))} placeholder="Pendência" className="rounded-xl border p-3"/><input type="date" value={progress.prazo} onChange={e=>setProgress(p=>({...p,prazo:e.target.value}))} className="rounded-xl border p-3"/><button disabled={busy} className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white">Registrar andamento</button></form>}{(contract.andamentos||[]).map(x=><article key={x.id} className="rounded-2xl border p-4"><div className="flex justify-between gap-3"><b>{x.etapaNova}</b><span className="text-xs text-slate-500">{date(x.registradoEm)}</span></div><p className="mt-2 text-sm">{x.descricao}</p>{x.pendencia&&<p className="mt-2 text-sm text-amber-700">Pendência: {x.pendencia}</p>}</article>)}</div>}
 {tab==="brasilapi"&&<div className="space-y-4">{canManage&&<button disabled={busy} onClick={()=>void consult()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"><RefreshCw size={16}/>Consultar CNPJ</button>}{(contract.consultasCnpj||[]).map(q=><article key={q.id} className="rounded-2xl border p-4"><div className="flex justify-between"><b>{q.sucesso?"Consulta concluída":"Consulta com falha"}</b><span className="text-xs text-slate-500">{date(q.consultadoEm)}</span></div>{q.erro&&<p className="mt-2 text-red-600">{q.erro}</p>}<p className="mt-2 text-sm">Divergências: {Object.keys(q.divergencias||{}).length}</p>{(q.socios||[]).length>0&&<div className="mt-3 space-y-2">{q.socios!.map(s=><div key={s.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><b>{s.nomeSocio||"Sócio"}</b><p>{s.qualificacaoSocio||"—"} · {s.documentoMascarado||"—"}</p></div>)}</div>}</article>)}</div>}
 {tab==="documentos"&&<div className="space-y-4">{canDocuments&&<form onSubmit={upload} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[180px_1fr_auto_auto]"><select value={docType} onChange={e=>setDocType(e.target.value)} className="rounded-xl border p-3">{docTypes.map(x=><option key={x}>{x}</option>)}</select><input type="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={e=>setFile(e.target.files?.[0]||null)} className="rounded-xl border p-2"/><label className="flex items-center gap-2"><input type="checkbox" checked={main} onChange={e=>setMain(e.target.checked)}/>Principal</label><button disabled={busy||!file} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"><FileUp size={16}/>Enviar</button></form>}<div className="space-y-2">{(contract.documentos||[]).map(d=><div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"><div><b>{d.nomeOriginal}</b><p className="text-xs text-slate-500">{d.tipo} · v{d.versao} · {Math.ceil(Number(d.tamanhoBytes)/1024)} KB</p></div><div className="flex gap-2"><button onClick={()=>void download(d)} className="rounded-lg border p-2" title="Baixar"><Download size={17}/></button>{canDocuments&&<button onClick={()=>void removeDoc(d.id)} className="rounded-lg border p-2 text-red-600" title="Excluir"><Trash2 size={17}/></button>}</div></div>)}</div></div>}
 </main></div></div>;
}
function Info({label,value}:{label:string;value?:string|null}){return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="whitespace-pre-wrap font-medium">{value||"—"}</p></div>}
