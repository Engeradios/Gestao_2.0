export const REQUEST_TYPES = [
  "ERRO",
  "MELHORIA",
  "NOVA_FUNCAO",
  "OUTRA",
] as const;

export const REQUEST_PRIORITIES = [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "CRITICA",
] as const;

export const REQUEST_STATUSES = [
  "ABERTA",
  "EM_ANALISE",
  "EM_DESENVOLVIMENTO",
  "CONCLUIDA",
  "CANCELADA",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface RequestUser {
  id: string;
  nome: string;
  email: string;
}

export interface RequestHistory {
  id: string;
  acao: string;
  statusAnterior: RequestStatus | null;
  statusNovo: RequestStatus | null;
  observacao: string | null;
  criadoEm: string;
  usuario: RequestUser | null;
}

export interface ServiceRequest {
  id: string;
  protocolo: string | null;
  solicitanteId: string;
  tipo: RequestType;
  titulo: string;
  descricao: string;
  paginaUrl: string | null;
  prioridade: RequestPriority;
  status: RequestStatus;
  resposta: string | null;
  responsavelId: string | null;
  emailStatus: string;
  emailErro: string | null;
  emailEnviadoEm: string | null;
  concluidaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  solicitante: RequestUser;
  responsavel: RequestUser | null;
  historicos?: RequestHistory[];
}

export interface RequestPagination {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface RequestListResponse {
  dados: ServiceRequest[];
  paginacao: RequestPagination;
}

export interface CreateRequestInput {
  tipo: RequestType;
  titulo: string;
  descricao: string;
  paginaUrl?: string;
  prioridade: RequestPriority;
}

export interface ManageRequestInput {
  status?: RequestStatus;
  prioridade?: RequestPriority;
  responsavelId?: string | null;
  resposta?: string;
  observacao?: string;
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  ERRO: "Erro",
  MELHORIA: "Melhoria",
  NOVA_FUNCAO: "Nova função",
  OUTRA: "Outra",
};

export const REQUEST_PRIORITY_LABELS: Record<RequestPriority, string> = {
  BAIXA: "Baixa",
  NORMAL: "Normal",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  ABERTA: "Aberta",
  EM_ANALISE: "Em análise",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export function requestErrorMessage(
  value: unknown,
  fallback = "Não foi possível concluir a operação.",
) {
  if (typeof value === "object" && value !== null && "message" in value) {
    const message = value.message;

    if (Array.isArray(message)) {
      return message.join(". ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}
