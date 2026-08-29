import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AuditQueryDto {
  @IsOptional()
  @IsUUID('4')
  usuarioId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  acao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entidadeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  busca?: string;

  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fim?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  limite = 25;
}
