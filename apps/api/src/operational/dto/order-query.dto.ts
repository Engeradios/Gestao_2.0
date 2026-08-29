import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class OrderQueryDto {
  @IsOptional() @IsString() @MaxLength(160) busca?: string;
  @IsOptional() @IsString() @MaxLength(80) status?: string;
  @IsOptional() @IsString() @MaxLength(120) situacao?: string;
  @IsOptional() @IsString() @MaxLength(255) tipo?: string;
  @IsOptional() @IsString() @MaxLength(2) uf?: string;
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fim?: string;
  @IsOptional() @IsDateString() aberturaInicio?: string;
  @IsOptional() @IsDateString() aberturaFim?: string;
  @IsOptional() @IsDateString() fechamentoInicio?: string;
  @IsOptional() @IsDateString() fechamentoFim?: string;
  @IsOptional()
  @IsIn(['ABERTA', 'AGUARDANDO_TRATATIVA', 'FECHADA', 'CANCELADA'])
  estado?: string;
  @IsOptional()
  // OS_PAINEL_ORDENACAO_DINAMICA
  @IsIn([
    'abertura',
    'fechamento',
    'numero',
    'clienteNome',
    'status',
    'uf',
    'tipo',
    'situacao',
    'tecnico',
  ])
  ordenarPor = 'abertura';
  @IsOptional() @IsIn(['asc', 'desc']) direcao: 'asc' | 'desc' = 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) limite = 25;
}
