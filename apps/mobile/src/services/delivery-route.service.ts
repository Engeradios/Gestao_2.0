import { api } from "./api";
export type DeliveryRoute = {
  id: string;
  dataRota: string;
  status: string;
  entregador?: { nome?: string } | null;
  veiculo?: { placa?: string; modelo?: string } | null;
  entregas?: DeliveryStop[];
};
export type DeliveryStop = {
  id: string;
  ordemExecucao: number;
  origem: string;
  origemNumero?: string | null;
  clienteNome?: string | null;
  enderecoEntrega?: string | null;
  status: string;
};
const base = "/estoque-logistica/roteiro-entrega";
export async function listarRoteiros(data?: string) {
  const r = await api.get<DeliveryRoute[]>(`${base}/roteiros`, {
    params: data ? { data } : undefined,
  });
  return r.data;
}
export async function obterRoteiro(id: string) {
  const r = await api.get<DeliveryRoute>(`${base}/roteiros/${id}`);
  return r.data;
}
export async function criarRoteiro(dataRota: string) {
  const r = await api.post<DeliveryRoute>(`${base}/roteiros`, { dataRota });
  return r.data;
}
export async function salvarParadas(id: string, paradas: unknown[]) {
  const r = await api.patch<DeliveryRoute>(`${base}/roteiros/${id}/paradas`, {
    paradas,
  });
  return r.data;
}
export async function despacharRoteiro(id: string) {
  const r = await api.post<DeliveryRoute>(`${base}/roteiros/${id}/despachar`);
  return r.data;
}
