import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const ETAPAS = [
  'CADASTRO_INICIAL',
  'MINUTA_EM_ELABORACAO',
  'REVISAO_INTERNA',
  'ENVIADA_AO_CLIENTE',
  'EM_NEGOCIACAO',
  'AJUSTES_SOLICITADOS',
  'APROVADA_INTERNAMENTE',
  'AGUARDANDO_ASSINATURA',
  'EM_ASSINATURA',
  'ASSINADA',
  'CANCELADA',
] as const;
const STATUS = [
  'RASCUNHO',
  'ATIVO',
  'SUSPENSO',
  'ENCERRADO',
  'RESCINDIDO',
  'CANCELADO',
] as const;

export class ContractQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) busca?: string;
  @IsOptional() @Transform(trim) @IsIn(ETAPAS) etapa?: string;
  @IsOptional() @Transform(trim) @IsIn(STATUS) status?: string;
  @IsOptional() @IsUUID('4') clienteId?: string;
  @IsOptional() @IsUUID('4') responsavelId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite = 25;
}

export class CreateContractDto {
  @IsUUID('4') clienteId!: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(300) titulo!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) tipo?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(10000) objeto?: string;
  @IsOptional() @Transform(trim) @IsIn(ETAPAS) etapa?: string;
  @IsOptional() @Transform(trim) @IsIn(STATUS) status?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  numeroDocumento?: string;
  @IsOptional() @IsDateString() dataAssinatura?: string;
  @IsOptional() @IsDateString() vigenciaInicio?: string;
  @IsOptional() @IsDateString() vigenciaFim?: string;
  @IsOptional() @IsBoolean() renovacaoAutomatica?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  avisoRenovacaoDias?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorGlobal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorMensal?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(3) moeda?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  indiceReajuste?: string;
  @IsOptional() @IsDateString() dataBaseReajuste?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  observacoes?: string;
  @IsOptional() @IsUUID('4') responsavelId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  propostaIds?: number[];
}

export class UpdateContractDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  titulo?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) tipo?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(10000) objeto?: string;
  @IsOptional() @Transform(trim) @IsIn(ETAPAS) etapa?: string;
  @IsOptional() @Transform(trim) @IsIn(STATUS) status?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  numeroDocumento?: string;
  @IsOptional() @IsDateString() dataAssinatura?: string;
  @IsOptional() @IsDateString() vigenciaInicio?: string;
  @IsOptional() @IsDateString() vigenciaFim?: string;
  @IsOptional() @IsBoolean() renovacaoAutomatica?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  avisoRenovacaoDias?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorGlobal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorMensal?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(3) moeda?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  indiceReajuste?: string;
  @IsOptional() @IsDateString() dataBaseReajuste?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  observacoes?: string;
  @IsOptional() @IsUUID('4') responsavelId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  propostaIds?: number[];
}

export class CreateContractProgressDto {
  @Transform(trim) @IsIn(ETAPAS) etapaNova!: string;
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  descricao!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  pendencia?: string;
  @IsOptional() @IsDateString() prazo?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  destinatario?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacaoInterna?: string;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  percentual!: number;
}
