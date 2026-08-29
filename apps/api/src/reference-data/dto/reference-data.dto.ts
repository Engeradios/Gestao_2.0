import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const PERSON_FUNCTIONS = [
  'TECNICO',
  'MOTORISTA',
  'ENTREGADOR',
  'VENDEDOR',
  'SUPERVISOR',
  'GERENTE',
  'ADMINISTRATIVO',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const optionalBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value as unknown;
};

const uniqueUpperArray = ({ value }: TransformFnParams): unknown => {
  if (!Array.isArray(value)) return value as unknown;

  return [
    ...new Set(
      (value as unknown[]).map((item) => String(item).trim().toUpperCase()),
    ),
  ];
};

export class ReferenceQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  busca?: string;

  @IsOptional()
  @Transform(upper)
  @IsIn(PERSON_FUNCTIONS)
  funcao?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(10)
  unidade?: string;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class CreatePersonDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @Transform(lower)
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  telefone?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(10)
  unidade?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  cargo?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(40)
  cnh?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  vencimentoCnh?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Transform(uniqueUpperArray)
  @IsIn(PERSON_FUNCTIONS, { each: true })
  funcoes?: string[];

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(40)
  origem?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  origemId?: string;
}

export class UpdatePersonDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome?: string;

  @IsOptional()
  @Transform(lower)
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  telefone?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(10)
  unidade?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  cargo?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(40)
  cnh?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  vencimentoCnh?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Transform(uniqueUpperArray)
  @IsIn(PERSON_FUNCTIONS, { each: true })
  funcoes?: string[];
}

export class UpdateStatusDto {
  @IsBoolean()
  ativo!: boolean;
}

export class VehicleQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  busca?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class CreateVehicleDto {
  @Transform(upper)
  @IsString()
  @Length(7, 7)
  placa!: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(80)
  marca?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  legadoId?: number;
}

export class UpdateVehicleDto {
  @IsOptional()
  @Transform(upper)
  @IsString()
  @Length(7, 7)
  placa?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(80)
  marca?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  legadoId?: number;
}
