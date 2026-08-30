import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import * as SecureStore from './secure-store';
import { offlineDatabase } from './offline-database.service';
import { evidenceAudit } from './evidence-flow-audit.service';
const API=process.env.EXPO_PUBLIC_API_URL;const TOKEN='engeradios.token';const MAX=10;
let localSequence=0;
function localEventId(){localSequence=(localSequence+1)%1_000_000;const time=Date.now().toString(36);const random=Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString(36);return `evidence-${time}-${localSequence.toString(36)}-${random}`;}
export type EvidenceDraft={orderId:string;sourceUri:string;name:string;mimeType:string;latitude?:number;longitude?:number};
export type OutboxSummary={pending:number;review:number;failed:number};
function directory(){if(!FileSystem.documentDirectory)throw new Error('Diretório local indisponível');return `${FileSystem.documentDirectory}outbox-evidencias/`}
export async function stageEvidence(input:EvidenceDraft){
 evidenceAudit('stage:start',{uri:input.sourceUri,mimeType:input.mimeType});
 await FileSystem.makeDirectoryAsync(directory(),{intermediates:true});
 const id=localEventId();const ext=(input.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').slice(0,8)||'jpg';const target=`${directory()}${id}.${ext}`;
 evidenceAudit('copy:before',{uri:input.sourceUri});
 await FileSystem.copyAsync({from:input.sourceUri,to:target});
 evidenceAudit('copy:after',{uri:target});
 const info=await FileSystem.getInfoAsync(target);evidenceAudit('copy:verified',{uri:target,exists:info.exists,size:info.exists&&'size' in info?info.size:null});if(!info.exists)throw new Error('Falha ao persistir evidência');
 const now=new Date().toISOString();const db=await offlineDatabase();
 evidenceAudit('sqlite:before',{uri:target});
 await db.runAsync(`INSERT INTO offline_outbox(id,kind,entity_id,payload_json,file_uri,created_at,updated_at,next_attempt_at) VALUES(?,?,?,?,?,?,?,?)`,id,'OS_EVIDENCE_UPLOAD',input.orderId,JSON.stringify({name:input.name,mimeType:input.mimeType,latitude:input.latitude,longitude:input.longitude,capturedAt:now}),target,now,now,now);
 evidenceAudit('sqlite:after',{uri:target,status:'PENDING',rows:1});
 return id;
}
export async function outboxSummary():Promise<OutboxSummary>{const db=await offlineDatabase();const rows=await db.getAllAsync<{status:string,total:number}>(`SELECT status,COUNT(*) total FROM offline_outbox GROUP BY status`);const count=(s:string)=>rows.find(x=>x.status===s)?.total??0;return {pending:count('PENDING')+count('SENDING'),review:count('REVIEW'),failed:count('FAILED')}}
export async function synchronizeEvidenceOutbox(){
 const network=await Network.getNetworkStateAsync();if(!network.isConnected||network.isInternetReachable===false)return outboxSummary();
 const token=await SecureStore.getItemAsync(TOKEN);if(!token||!API)return outboxSummary();const db=await offlineDatabase();
 const rows=await db.getAllAsync<{id:string;entity_id:string;payload_json:string;file_uri:string;attempts:number}>(`SELECT id,entity_id,payload_json,file_uri,attempts FROM offline_outbox WHERE status='PENDING' AND attempts<? AND next_attempt_at<=? ORDER BY created_at LIMIT 10`,MAX,new Date().toISOString());
 for(const row of rows){
  await db.runAsync(`UPDATE offline_outbox SET status='SENDING',updated_at=? WHERE id=?`,new Date().toISOString(),row.id);
  try{const payload=JSON.parse(row.payload_json) as {name:string;mimeType:string;latitude?:number;longitude?:number;capturedAt:string};const info=await FileSystem.getInfoAsync(row.file_uri);if(!info.exists)throw new Error('Arquivo local ausente');
   const form=new FormData();form.append('arquivo',{uri:row.file_uri,name:payload.name,type:payload.mimeType} as unknown as Blob);form.append('tipo','FOTO');form.append('capturadoEm',payload.capturedAt);if(payload.latitude!==undefined)form.append('latitude',String(payload.latitude));if(payload.longitude!==undefined)form.append('longitude',String(payload.longitude));
   const response=await fetch(`${API}/app-campo/os/${encodeURIComponent(row.entity_id)}/evidencias`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});if(!response.ok)throw new Error(`HTTP ${response.status}`);
   await db.runAsync('DELETE FROM offline_outbox WHERE id=?',row.id);await FileSystem.deleteAsync(row.file_uri,{idempotent:true});
  }catch(error){const message=error instanceof Error?error.message:String(error);const timeout=/timeout|network request failed|aborted/i.test(message);const attempts=row.attempts+1;const status=timeout?'REVIEW':attempts>=MAX?'FAILED':'PENDING';const delay=Math.min(15*60_000,30_000*2**Math.min(attempts,5));await db.runAsync(`UPDATE offline_outbox SET status=?,attempts=?,last_error=?,updated_at=?,next_attempt_at=? WHERE id=?`,status,attempts,message.slice(0,500),new Date().toISOString(),new Date(Date.now()+delay).toISOString(),row.id);}
 }
 return outboxSummary();
}

export type SafeOutboxItem = {
  shortId: string;
  kind: string;
  status: string;
  attempts: number;
  createdAt: string;
  filePresent: boolean;
};

export type DetailedOutboxSummary = {
  evidencePending: number;
  evidenceReview: number;
  evidenceFailed: number;
  otherPending: number;
  total: number;
  items: SafeOutboxItem[];
};

export async function detailedOutboxSummary(): Promise<DetailedOutboxSummary> {
  const db = await offlineDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    kind: string;
    status: string;
    attempts: number;
    created_at: string;
    file_uri: string | null;
  }>(`SELECT id, kind, status, attempts, created_at, file_uri
       FROM offline_outbox
       ORDER BY created_at DESC
       LIMIT 50`);

  const items = await Promise.all(rows.map(async row => {
    let filePresent = false;
    if (row.file_uri) {
      const info = await FileSystem.getInfoAsync(row.file_uri).catch(() => ({ exists: false }));
      filePresent = info.exists;
    }
    return {
      shortId: row.id.slice(-8),
      kind: row.kind,
      status: row.status,
      attempts: row.attempts,
      createdAt: row.created_at,
      filePresent,
    };
  }));

  const evidence = rows.filter(row => row.kind === 'OS_EVIDENCE_UPLOAD');
  return {
    evidencePending: evidence.filter(row => row.status === 'PENDING' || row.status === 'SENDING').length,
    evidenceReview: evidence.filter(row => row.status === 'REVIEW').length,
    evidenceFailed: evidence.filter(row => row.status === 'FAILED').length,
    otherPending: rows.filter(row => row.kind !== 'OS_EVIDENCE_UPLOAD' && row.status !== 'DONE').length,
    total: rows.length,
    items,
  };
}
