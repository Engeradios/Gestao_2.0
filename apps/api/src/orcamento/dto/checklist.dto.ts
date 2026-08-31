import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrcTipoItem, OrcTipoPergunta } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ChecklistOpcaoDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  valor!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  rotulo!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  ordem!: number;
}

export class ChecklistPerguntaDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  codigo!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  titulo!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ajuda?: string;

  @IsEnum(OrcTipoPergunta)
  tipo!: OrcTipoPergunta;

  @IsBoolean()
  obrigatoria!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  ordem!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ChecklistOpcaoDto)
  opcoes?: ChecklistOpcaoDto[];
}

export class ChecklistGrupoDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  ordem!: number;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ChecklistPerguntaDto)
  perguntas!: ChecklistPerguntaDto[];
}

export class CriarChecklistModeloDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  descricao?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ChecklistGrupoDto)
  grupos!: ChecklistGrupoDto[];
}

export class CriarRegraCondicionalDto {
  @Transform(trim)
  @IsUUID('4')
  perguntaOrigemId!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  perguntaDestinoCodigo!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  operador!: string;

  @IsObject()
  valor!: Record<string, unknown>;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  acao!: string;
}

export class CriarMaterialBasicoDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  codigo!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nome!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  descricao?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unidade!: string;

  @IsEnum(OrcTipoItem)
  tipo!: OrcTipoItem;
}

export class VincularMaterialPerguntaDto {
  @Transform(trim)
  @IsUUID('4')
  perguntaId!: string;

  @Transform(trim)
  @IsUUID('4')
  materialId!: string;

  @IsOptional()
  @IsObject()
  condicao?: Record<string, unknown>;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  quantidadeFormula?: string;
}
