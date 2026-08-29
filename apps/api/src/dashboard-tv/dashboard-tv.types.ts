export type DashboardTvInput = {
  nome: string;
  slug?: string;
  descricao?: string | null;
  tema?: string;
  atualizacaoMinutos?: number;
  cenaSegundos?: number;
  mostrarClima?: boolean;
  mostrarRelogio?: boolean;
  mostrarPaginacao?: boolean;
  permitirFinanceiro?: boolean;
  ativo?: boolean;
};
export type CenaInput = {
  nome: string;
  ordem?: number;
  ativa?: boolean;
  duracaoSegundos?: number | null;
  configuracao?: Record<string, unknown>;
};
export type WidgetInput = {
  tipo: string;
  titulo: string;
  ordem?: number;
  ativo?: boolean;
  configuracao?: Record<string, unknown>;
};

export type DashboardTvHeartbeatInput = {
  identificador: string;
  apelido?: string | null;
  resolucao?: string | null;
  navegador?: string | null;
  versaoApp?: string | null;
};
