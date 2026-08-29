import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const STATUS = [
  'Planejamento',
  'Em execução',
  'Concluído',
  'Paralisado',
  'Cancelado',
];
const ESCOPOS = [
  'LOCACAO_MENSAL',
  'LOCACAO_VENDA_FUTURA',
  'INSTALACAO_ART',
  'VENDA',
];
export class ProjectQueryDto {
  @IsOptional() @IsString() @MaxLength(160) busca?: string;
  @IsOptional() @IsIn(STATUS) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite = 25;
}
export class ProjectDto {
  @IsString() @MaxLength(200) nome!: string;
  @IsOptional() @IsString() @MaxLength(40) proposta?: string;
  @IsOptional() @IsString() @MaxLength(30) codigo?: string;
  @IsOptional() @IsString() @MaxLength(200) cliente?: string;
  @IsOptional() @IsString() @MaxLength(200) clienteLocal?: string;
  @IsOptional() @IsString() @MaxLength(2) uf?: string;
  @IsOptional() @IsString() @MaxLength(120) gerente?: string;
  @IsOptional() @IsIn(STATUS) status?: string;
  @IsOptional() @IsIn(ESCOPOS) tipoEscopo?: string;
  @IsOptional() @IsString() @MaxLength(40) numeroContrato?: string;
  @IsOptional() @IsString() @MaxLength(40) numeroPedido?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) mesesContrato?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorMensal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorResidual?: number;
  @IsOptional() @IsBoolean() transfereFinal?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorContrato?: number;
  @IsOptional() @IsDateString() dataInicio?: string;
  @IsOptional() @IsDateString() dataFimPrev?: string;
  @IsOptional() @IsDateString() dataFimReal?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  aliqSimples?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  aliqIss?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  aliqOutros?: number;
  @IsOptional() @IsString() observacoes?: string;
}
export class CostDto {
  @IsOptional() @IsString() @MaxLength(30) categoria?: string;
  @IsOptional() @IsIn(['direto', 'indireto']) tipo?: string;
  @IsString() @MaxLength(255) descricao!: string;
  @IsOptional() @IsString() @MaxLength(200) fornecedor?: string;
  @IsOptional() @IsString() @MaxLength(60) documento?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorOrcado?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorRealizado?: number;
  @IsOptional() @IsDateString() dataCusto?: string;
}
export class MaterialDto {
  @IsString() @MaxLength(200) produto!: string;
  @IsOptional() @IsString() @MaxLength(20) unidade?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) qtdPrevista?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) qtdEntregue?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorUnit?: number;
  @IsOptional() @IsDateString() dataEntrega?: string;
  @IsOptional() @IsString() @MaxLength(40) nf?: string;
  @IsOptional() @IsString() observacoes?: string;
}
export class OrderDto {
  @IsString() @MaxLength(40) numeroOs!: string;
  @IsOptional() @IsString() @MaxLength(120) tipo?: string;
  @IsOptional() @IsString() @MaxLength(30) situacao?: string;
  @IsOptional() @IsString() @MaxLength(200) tecnico?: string;
  @IsOptional() @IsString() @MaxLength(300) descricao?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valor?: number;
  @IsOptional() @IsDateString() dataAbertura?: string;
  @IsOptional() @IsDateString() dataFechamento?: string;
}
export class MilestoneDto {
  @IsOptional() @IsString() @MaxLength(30) tipo?: string;
  @IsString() @MaxLength(200) titulo!: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentual?: number;
  @IsOptional() @IsDateString() dataMarco?: string;
}
export class ReportDto {
  @IsIn(['INICIO', 'FIM']) tipo!: string;
  @IsOptional() @IsString() @MaxLength(20) status?: string;
  @IsOptional() @IsString() @MaxLength(160) responsavel?: string;
  @IsOptional() @IsDateString() dataRelatorio?: string;
  @IsOptional() @IsObject() dados?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(160) assinaturaTec?: string;
  @IsOptional() @IsString() @MaxLength(160) assinaturaCli?: string;
}
