import { Transform, Type } from 'class-transformer';
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
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;
export class FinanceQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(180) busca?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) situacao?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) filial?: string;
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fim?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) limite = 25;
}
export class PayableDto {
  @Transform(trim) @IsString() @MaxLength(255) descricao!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  fornecedor?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) documento?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) filial?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) formaPgto?: string;
  @IsOptional() @IsDateString() dataEmissao?: string;
  @IsOptional() @IsDateString() dataVencimento?: string;
  @IsOptional() @IsDateString() dataPagamento?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valor?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorPago?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) jurosMulta?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) desconto?: number;
  @IsOptional() @Type(() => BigInt) dreContaId?: bigint;
  @IsOptional() @Transform(trim) @IsString() observacoes?: string;
  @IsOptional() @IsBoolean() recorrente?: boolean;
}
export class SettlementDto {
  @IsDateString() dataPagamento!: string;
  @Type(() => Number) @IsNumber() @Min(0) valorPago!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) jurosMulta?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) desconto?: number;
}
export class ReceivableDto {
  @Transform(trim) @IsString() @MaxLength(180) chaveTitulo!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) filial?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) documento?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(255) cliente?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2) uf?: string;
  @IsOptional() @IsDateString() dataEmissao?: string;
  @IsOptional() @IsDateString() dataVencto?: string;
  @IsOptional() @IsDateString() dataRecebimento?: string;
  @IsOptional() @Type(() => Number) @IsNumber() valorEmissao?: number;
  @IsOptional() @Type(() => Number) @IsNumber() valorDevido?: number;
  @IsOptional() @Type(() => Number) @IsNumber() valorRecebido?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) situacao?: string;
}
export class DreDto {
  @Transform(trim) @IsString() @MaxLength(40) codigo!: string;
  @Transform(trim) @IsString() @MaxLength(180) nome!: string;
  @IsOptional() @IsIn(['C', 'D']) natureza?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) grupoDre?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) setor?: string;
  @IsOptional() @Type(() => Number) @IsInt() ordem?: number;
  @IsOptional() @IsBoolean() isGrupo?: boolean;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
export class BalanceDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) filial?: string;
  @IsDateString() dataRef!: string;
  @Type(() => Number) @IsNumber() valor!: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(255) descricao?: string;
}
export class NoteDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) chave?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) numero?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(255) emitNome?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(30) emitCnpj?: string;
  @IsOptional() @IsDateString() dataEmissao?: string;
  @IsOptional() @IsDateString() dataEntrada?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorTotal?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) situacao?: string;
  @IsOptional() @Transform(trim) @IsString() observacoes?: string;
  @IsOptional() @IsObject() itens?: Record<string, unknown>[];
  @IsOptional() @IsObject() parcelas?: Record<string, unknown>[];
}
