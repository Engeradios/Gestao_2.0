import { Type, Transform } from 'class-transformer';
import { IsBooleanString, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

/**
 * Filtros do painel de equipe.
 * Decisao 1b: por padrao retorna TODOS com telemetria na janela (ativos e
 * encerrados); a interface aplica o filtro visual.
 */
export class TeamQueryDto {
  /** Janela de busca em horas (1 a 72). Padrao: 12. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(72)
  horas?: number;

  /** 'true' retorna apenas expedientes ATIVOS. Padrao: false. */
  @IsOptional()
  @IsBooleanString()
  somenteAtivos?: string;
}

/** Filtros da trilha (percurso) de um expediente. */
export class TrackQueryDto {
  /** Limite de pontos retornados (1 a 5000). Padrao: 1000. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limite?: number;
}

/** Item retornado pelo painel de equipe. */
export interface TeamMemberPosition {
  usuarioId: string;
  nome: string;
  email: string | null;
  funcao: string | null;
  cargo: string | null;
  unidade: string | null;
  fotoPerfilCaminho: string | null;
  expedienteId: string | null;
  expedienteStatus: string | null;
  latitude: number;
  longitude: number;
  precisaoMetros: number | null;
  bateriaPercentual: number | null;
  tipoConexao: string | null;
  online: boolean | null;
  capturadoEm: Date;
  minutosDesdeCaptura: number;
  /** ATIVO_RECENTE | ATIVO_SEM_SINAL | ENCERRADO */
  estado: string;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    completo: string | null;
  };
}

export class ReportQueryDto {
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fim?: string;
  @Transform(({ value }) => value === "" ? undefined : value)
  @IsOptional() @IsUUID() usuarioId?: string;
  @Transform(({ value }) => value === "" ? undefined : value)
  @IsOptional() @IsString() @MaxLength(160) busca?: string;
  @Transform(({ value }) => value === "" ? undefined : value)
  @IsOptional() @IsIn(["ATIVO", "PAUSADO", "FINALIZADO"]) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) limite?: number;
}
