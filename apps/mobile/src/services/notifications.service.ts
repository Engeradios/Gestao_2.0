import { api } from './api';
export type UserNotification={id:string;titulo:string;mensagem:string;tipo:string;criadaEm:string;lidaEm:string|null;link:string|null};
type UnknownRecord=Record<string,unknown>;
const ONE_TEMPLATE=':id/lida';
const ALL_PATH='marcar-todas-lidas';
function normalize(raw:unknown):{items:UserNotification[];unread:number}{
 const root=(raw&&typeof raw==='object'?raw:{}) as UnknownRecord;
 const source=Array.isArray(raw)?raw:Array.isArray(root.items)?root.items:Array.isArray(root.notificacoes)?root.notificacoes:Array.isArray(root.data)?root.data:[];
 const items=source.filter(x=>x&&typeof x==='object').map((x)=>{const n=x as UnknownRecord;return {id:String(n.id??''),titulo:String(n.titulo??n.title??'Notificação'),mensagem:String(n.mensagem??n.message??n.descricao??''),tipo:String(n.tipo??n.type??'SISTEMA'),criadaEm:String(n.criadaEm??n.createdAt??new Date().toISOString()),lidaEm:n.lidaEm||n.readAt?String(n.lidaEm??n.readAt):null,link:n.link?String(n.link):null}}).filter(x=>x.id);
 const explicit=Number(root.naoLidas??root.unread??root.unreadCount);
 return {items,unread:Number.isFinite(explicit)?explicit:items.filter(x=>!x.lidaEm).length};
}
export async function listNotifications(){const r=await api.get('/usuarios/me/notificacoes');return normalize(r.data)}
export async function markNotificationRead(id:string){const path='/usuarios/me/notificacoes/'+ONE_TEMPLATE.replace(':id',encodeURIComponent(id));await api.patch(path)}
export async function markAllNotificationsRead(){await api.patch('/usuarios/me/notificacoes/'+ALL_PATH)}
