import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrcStatus, OrcTipoItem } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CriarOrcamentoDto {
  @Transform(trim)
  @IsUUID('4')
  clienteId!: string;

  @Transform(trim)
  @IsUUID('4')
  tecnicoId!: string;

  @Transform(trim)
  @IsOptional()
  @IsUUID('4')
  checklistModeloId?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  titulo?: string;
}

export class AtualizarOrcamentoDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  titulo?: string;

  @Transform(trim)
  @IsOptional()
  @IsUUID('4')
  checklistModeloId?: string;
}

export class RespostaOrcamentoDto {
  @Transform(trim)
  @IsUUID('4')
  perguntaId!: string;

  @IsObject()
  valor!: Record<string, unknown>;
}

export class SalvarRespostasOrcamentoDto {
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => RespostaOrcamentoDto)
  respostas!: RespostaOrcamentoDto[];
}

export class ItemOrcamentoDto {
  @Transform(trim)
  @IsOptional()
  @IsUUID('4')
  materialId?: string;

  @IsEnum(OrcTipoItem)
  tipo!: OrcTipoItem;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  descricao!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 20)
  unidade!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999)
  quantidade!: number;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  origem?: string;
}

export class SalvarItensOrcamentoDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ItemOrcamentoDto)
  itens!: ItemOrcamentoDto[];
}

export class AceitarOrcamentoDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;
}

export class DevolverOrcamentoDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @Length(5, 2000)
  observacao!: string;
}

export class RecusarOrcamentoDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @Length(5, 2000)
  motivo!: string;
}

export class VincularPropostaDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  propostaNumero!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justificativaDivergencia?: string;
}

export class ConsultarOrcamentosDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  busca?: string;

  @IsOptional()
  @IsEnum(OrcStatus)
  status?: OrcStatus;

  @Transform(trim)
  @IsOptional()
  @IsUUID('4')
  clienteId?: string;

  @Transform(trim)
  @IsOptional()
  @IsUUID('4')
  tecnicoId?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;
}
