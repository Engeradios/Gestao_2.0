export type GpPermission =
  | "GRANDES_PROJETOS.VISITAS.VISUALIZAR" | "GRANDES_PROJETOS.VISITAS.GERENCIAR"
  | "GRANDES_PROJETOS.EQUIPE.VISUALIZAR" | "GRANDES_PROJETOS.EQUIPE.GERENCIAR"
  | "GRANDES_PROJETOS.RISCOS.VISUALIZAR" | "GRANDES_PROJETOS.RISCOS.GERENCIAR";
export type GpVisitStatus = "PROGRAMADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
export type GpRiskImpact = "BAIXO" | "MODERADO" | "ALTO" | "CRITICO";
export type GpRiskProbability = "BAIXA" | "MEDIA" | "ALTA";
export type GpRiskCriticality = "BAIXA" | "MODERADA" | "ALTA" | "CRITICA";
export type GpRiskStatus = "ABERTO" | "EM_TRATAMENTO" | "MITIGADO" | "ENCERRADO";
export interface GpPagination { pagina:number; limite:number; total:number; paginas:number; }
export interface GpPage<T> { itens:T[]; paginacao:GpPagination; }
export interface GpVersionedRecord { id:string|number; versao:number; criado_em?:string; atualizado_em?:string; }
export interface GpVisit extends GpVersionedRecord { projeto_id?:number; os_id?:number|null; tecnico?:string|null; funcionario_id?:string|null; data_inicio:string; data_fim?:string|null; objetivo?:string|null; atividade_realizada?:string|null; pendencias?:string|null; proxima_acao?:string|null; latitude?:number|null; longitude?:number|null; custo?:number|string|null; status?:GpVisitStatus|null; }
export interface GpVisitInput { osId?:number; tecnico?:string; funcionarioId?:string; dataInicio:string; dataFim?:string; objetivo?:string; atividadeRealizada?:string; pendencias?:string; proximaAcao?:string; latitude?:number; longitude?:number; custo?:number; status?:GpVisitStatus; versao?:number; }
export interface GpTeamMember extends GpVersionedRecord { projeto_id?:number; funcionario_id?:string|null; nome:string; funcao?:string|null; vigencia_inicio?:string|null; vigencia_fim?:string|null; custo_gerencial_mensal?:number|string|null; }
export interface GpTeamInput { funcionarioId?:string; nome:string; funcao?:string; vigenciaInicio?:string; vigenciaFim?:string; custoGerencialMensal?:number; versao?:number; }
export interface GpRisk extends GpVersionedRecord { projeto_id?:number; titulo:string; descricao?:string|null; impacto?:GpRiskImpact|null; probabilidade?:GpRiskProbability|null; criticidade?:GpRiskCriticality|null; responsavel?:string|null; prazo?:string|null; status?:GpRiskStatus|null; plano_acao?:string|null; }
export interface GpRiskInput { titulo:string; descricao?:string; impacto?:GpRiskImpact; probabilidade?:GpRiskProbability; criticidade?:GpRiskCriticality; responsavel?:string; prazo?:string; status?:GpRiskStatus; planoAcao?:string; versao?:number; }
export interface GpDeleteInput { versao:number; motivo:string; }
export interface GpGovernancePermissions { canViewVisits:boolean; canManageVisits:boolean; canViewTeam:boolean; canManageTeam:boolean; canViewRisks:boolean; canManageRisks:boolean; }
