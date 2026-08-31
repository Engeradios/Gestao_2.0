import * as Network from 'expo-network';
import { create } from 'zustand';

type ConnectivityState={online:boolean;initialized:boolean;type:string;setNetwork:(state:Network.NetworkState)=>void;refresh:()=>Promise<boolean>};
function connected(state:Network.NetworkState){return Boolean(state.isConnected && state.isInternetReachable !== false)}
export const useConnectivityStore=create<ConnectivityState>((set)=>({
 online:true,initialized:false,type:'UNKNOWN',
 setNetwork:(state)=>set({online:connected(state),initialized:true,type:String(state.type)}),
 refresh:async()=>{try{const state=await Network.getNetworkStateAsync();const online=connected(state);set({online,initialized:true,type:String(state.type)});return online}catch{set({online:false,initialized:true,type:'UNKNOWN'});return false}},
}));
export function isOfflineMessage(value:unknown){const message=value instanceof Error?value.message:String(value??'');return /sem conexão|network error|network request failed|failed to fetch|timeout|econn/i.test(message)}
