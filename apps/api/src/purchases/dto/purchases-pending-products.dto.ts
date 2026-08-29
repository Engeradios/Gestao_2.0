import { Transform, Type } from 'class-transformer';
import {
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
export class PendingProductsQueryDto {
  @Transform(trim) @IsOptional() @IsString() @MaxLength(160) busca?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(40) proposta?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(200) cliente?: string;
  @Transform(trim)
  @IsOptional()
  @IsIn(['PENDENTE', 'COMPRA_PARCIAL'])
  status?: string;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) pagina = 1;
  @Type(() => Number) @IsOptional() @IsInt() @Min(10) @Max(500) limite = 50;
  @Transform(trim)
  @IsOptional()
  @IsIn(['codigo', 'descricao', 'saldo', 'propostas'])
  ordenar = 'descricao';
  @Transform(trim) @IsOptional() @IsIn(['asc', 'desc']) direcao = 'asc';
}
