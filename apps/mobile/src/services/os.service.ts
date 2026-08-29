import { api } from './api';
import type { Indicadores,OsDetalhe,OsLista } from '../types/os';
export async function listarOs(params:{pagina?:number;limite?:number;busca?:string}={}):Promise<OsLista>{const {data}=await api.get('/operacional/os',{params:{pagina:params.pagina??1,limite:params.limite??20,busca:params.busca||undefined}});return data;}
export async function indicadores():Promise<Indicadores>{const {data}=await api.get('/operacional/os/indicadores');return data;}
export async function obterOs(id:string):Promise<OsDetalhe>{const {data}=await api.get(`/operacional/os/${id}`);return data;}
