export type TvSceneLayout = "AUTO" | "GRADE" | "DESTAQUE";
export type TvWidgetSize = "PEQUENO" | "MEDIO" | "GRANDE" | "TOTAL";
export type TvWidgetColor =
  "VERMELHO" | "LARANJA" | "VERDE" | "AZUL" | "ROXO" | "ROSA" | "CIANO";
export type TvSceneConfig = Record<string, unknown> & {
  layout?: TvSceneLayout;
};
export type TvWidgetConfig = Record<string, unknown> & {
  tamanho?: TvWidgetSize;
  cor?: TvWidgetColor;
  limite?: number;
};

export type TvWidget = {
  id: string;
  cenaId: string;
  tipo: string;
  titulo: string;
  ordem: number;
  ativo: boolean;
  configuracao: TvWidgetConfig;
};
export type TvScene = {
  id: string;
  dashboardId: string;
  nome: string;
  ordem: number;
  ativa: boolean;
  duracaoSegundos?: number | null;
  configuracao: TvSceneConfig;
  widgets: TvWidget[];
};
export type TvDashboard = {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  ativo: boolean;
  publicado: boolean;
  tema: string;
  atualizacaoMinutos: number;
  cenaSegundos: number;
  mostrarClima: boolean;
  mostrarRelogio: boolean;
  mostrarPaginacao: boolean;
  permitirFinanceiro: boolean;
  cenas: TvScene[];
  _count?: { cenas: number };
};
export type TvCatalogItem = {
  tipo: string;
  grupo: string;
  titulo: string;
  formato: string;
  financeiro: boolean;
};
export type TvPayload = {
  painel: TvDashboard;
  dados: Record<string, unknown>;
  geradoEm: string;
};

export type TvDashboardDevice = {
  id: string;
  identificador: string;
  apelido?: string | null;
  resolucao?: string | null;
  navegador?: string | null;
  versaoApp?: string | null;
  ultimoContatoEm: string;
  criadoEm: string;
  online: boolean;
};
