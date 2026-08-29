import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RouteTechniciansQueryDto {
  @IsOptional() @Transform(trim) @IsIn(['RJ', 'SP']) unidade?: string;
}

export class RouteDispatchQueryDto extends RouteTechniciansQueryDto {
  @IsOptional() @IsISO8601({ strict: true }) data?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  statusOperacional?: string;
}

export class RouteAgendaQueryDto extends RouteTechniciansQueryDto {
  @IsOptional() @IsISO8601({ strict: true }) dataInicio?: string;
  @IsOptional() @IsISO8601({ strict: true }) dataFim?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) tecnico?: string;
}

export class CreateRouteVisitDto extends RouteTechniciansQueryDto {
  @IsISO8601({ strict: true }) dataVisita!: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) tecnico!: string;
  @Transform(trim)
  @IsIn(['OPERACIONAL', 'PREVENTIVA', 'SEDE', 'AFASTADO'])
  tipo!: string;
  @IsOptional() @Transform(trim) @IsIn(['Diurno', 'Noturno']) turno?: string;
  @ValidateIf((o: CreateRouteVisitDto) =>
    ['OPERACIONAL', 'PREVENTIVA'].includes(o.tipo),
  )
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  origemId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  diasAfastamento?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  ordemExecucao?: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacoes?: string;
}

export class MoveRouteVisitDto extends RouteTechniciansQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  tecnico?: string;

  @IsOptional()
  @Transform(trim)
  @IsIn(['OPERACIONAL', 'PREVENTIVA', 'SEDE', 'AFASTADO'])
  tipo?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  origemId?: string;

  @IsOptional()
  @Transform(trim)
  @IsIn(['Diurno', 'Noturno'])
  turno?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  ordemExecucao?: number;
}

export class UpdateRouteStatusDto {
  @Transform(trim)
  @IsIn([
    'Agendado',
    'Em Deslocamento',
    'Em Atendimento',
    'Realizado',
    'Frustrado',
    'Cancelado',
  ])
  status!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacoes?: string;
}

export class CompleteRouteDto extends RouteTechniciansQueryDto {
  @IsISO8601({ strict: true }) dataVisita!: string;
}
