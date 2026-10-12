import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const booleanValue = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
};

export class DocumentosFiscaisQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsIn(['RECEBIDO', 'EMITIDO'])
  direcao?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  tipo?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  modelo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  filialId?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  statusFiscal?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  statusProcessamento?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  statusConferencia?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  emitenteDocumento?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  destinatarioDocumento?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  chave?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  numero?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  serie?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(180)
  termo?: string;

  @IsOptional()
  @IsDateString()
  dataInicial?: string;

  @IsOptional()
  @IsDateString()
  dataFinal?: string;

  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  comXml?: boolean;

  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  comVinculoFinanceiro?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @IsIn([
    'dataEmissao',
    'criadoEm',
    'atualizadoEm',
    'numero',
    'valorTotal',
  ])
  orderBy = 'dataEmissao';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection: 'asc' | 'desc' = 'desc';
}
