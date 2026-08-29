import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export const REQUEST_TYPES = [
  'ERRO',
  'MELHORIA',
  'NOVA_FUNCAO',
  'OUTRA',
] as const;

export const REQUEST_PRIORITIES = [
  'BAIXA',
  'NORMAL',
  'ALTA',
  'CRITICA',
] as const;

export const REQUEST_STATUSES = [
  'ABERTA',
  'EM_ANALISE',
  'EM_DESENVOLVIMENTO',
  'CONCLUIDA',
  'CANCELADA',
] as const;

export class CreateRequestDto {
  @Transform(upper)
  @IsIn(REQUEST_TYPES)
  tipo!: (typeof REQUEST_TYPES)[number];

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(180)
  titulo!: string;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  descricao!: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/^(\/[^\s]*|https?:\/\/[^\s]+)$/i, {
    message: 'paginaUrl deve ser uma rota interna ou URL HTTP(S)',
  })
  @MaxLength(500)
  paginaUrl?: string;

  @IsOptional()
  @Transform(upper)
  @IsIn(REQUEST_PRIORITIES)
  prioridade: (typeof REQUEST_PRIORITIES)[number] = 'NORMAL';
}

export class RequestQueryDto {
  @IsOptional()
  @Transform(upper)
  @IsIn(REQUEST_TYPES)
  tipo?: (typeof REQUEST_TYPES)[number];

  @IsOptional()
  @Transform(upper)
  @IsIn(REQUEST_STATUSES)
  status?: (typeof REQUEST_STATUSES)[number];

  @IsOptional()
  @Transform(upper)
  @IsIn(REQUEST_PRIORITIES)
  prioridade?: (typeof REQUEST_PRIORITIES)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(180)
  busca?: string;

  @IsOptional()
  @IsUUID('4')
  solicitanteId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina = 1;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  limite = 25;
}

export class ManageRequestDto {
  @IsOptional()
  @Transform(upper)
  @IsIn(REQUEST_STATUSES)
  status?: (typeof REQUEST_STATUSES)[number];

  @IsOptional()
  @Transform(upper)
  @IsIn(REQUEST_PRIORITIES)
  prioridade?: (typeof REQUEST_PRIORITIES)[number];

  @IsOptional()
  @ValidateIf((_object, value: unknown) => value !== null && value !== '')
  @IsUUID('4')
  responsavelId?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  resposta?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacao?: string;
}
