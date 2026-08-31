import { create } from 'zustand';
import { useAuthStore } from './auth.store';
import { useConnectivityStore } from './connectivity.store';
import { listNotifications,markAllNotificationsRead,markNotificationRead,type UserNotification } from '../services/notifications.service';
import { loadNotificationCache,pendingReads,queueRead,removePendingRead,saveNotificationCache } from '../services/notifications-offline.service';
function userKey(){const u=useAuthStore.getState().user as {id?:string;sub?:string;email?:string}|null;return String(u?.id??u?.sub??u?.email??'anonymous')}
type State={items:UserNotification[];unread:number;loading:boolean;error:string|null;hydrated:boolean;hydrate:()=>Promise<void>;load:()=>Promise<void>;flush:()=>Promise<void>;read:(id:string)=>Promise<void>;readAll:()=>Promise<void>};
export const useNotificationsStore=create<State>((set,get)=>({items:[],unread:0,loading:false,error:null,hydrated:false,
 hydrate:async()=>{const data=await loadNotificationCache(userKey());set({...data,hydrated:true})},
 flush:async()=>{if(!useConnectivityStore.getState().online)return;for(const row of await pendingReads(userKey())){try{if(row.operation==='READ_ALL')await markAllNotificationsRead();else if(row.notification_id)await markNotificationRead(row.notification_id);await removePendingRead(row.id)}catch{return}}},
 load:async()=>{if(!get().hydrated)await get().hydrate();if(!useConnectivityStore.getState().online)return;set({loading:true,error:null});try{await get().flush();const data=await listNotifications();await saveNotificationCache(userKey(),data);set({...data,loading:false,hydrated:true})}catch{set({loading:false,error:get().items.length?null:'Não foi possível atualizar as notificações.'})}},
 read:async(id)=>{const now=new Date().toISOString();const items=get().items.map(x=>x.id===id?{...x,lidaEm:x.lidaEm??now}:x);const data={items,unread:items.filter(x=>!x.lidaEm).length};set(data);await saveNotificationCache(userKey(),data);await queueRead(userKey(),id);if(useConnectivityStore.getState().online)await get().flush()},
 readAll:async()=>{const now=new Date().toISOString();const items=get().items.map(x=>({...x,lidaEm:x.lidaEm??now}));const data={items,unread:0};set(data);await saveNotificationCache(userKey(),data);await queueRead(userKey(),null);if(useConnectivityStore.getState().online)await get().flush()},
}));
