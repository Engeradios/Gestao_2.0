import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class DeliveryRouteStopDto {
  @Transform(trim)
  @IsIn(['OS', 'PEDIDO', 'OUTRO'])
  origem!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  origemNumero?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  clienteNome?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  enderecoEntrega?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  bairro?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  cidade?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2)
  uf?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  ordemExecucao!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacaoRota?: string;
}

export class SaveDeliveryRouteStopsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryRouteStopDto)
  paradas!: DeliveryRouteStopDto[];
}

export class SaveDeliveryRouteHeaderDto {
  @IsISO8601({ strict: true })
  dataRota!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  entregadorId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  veiculoId!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacoes?: string;
}

export class DeliveryRouteQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  data?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entregadorId?: number;
}

export class DeliverySourceQueryDto {
  @Transform(trim)
  @IsIn(['OS', 'PEDIDO'])
  origem!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  numero!: string;
}

export class SaveDeliveryDto {
  @IsISO8601({ strict: true })
  dataEntrega!: string;

  @Transform(trim)
  @IsIn(['OS', 'PEDIDO', 'OUTRO'])
  origem!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  origemNumero?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  clienteNome?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  enderecoEntrega?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  bairro?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  cidade?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2)
  uf?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entregadorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  veiculoId?: number;

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
  observacaoRota?: string;

  @IsOptional()
  @IsBoolean()
  isReentrega?: boolean;
}

export class DeliveryStatusDto {
  @Transform(trim)
  @IsIn(['Agendado', 'Em Rota', 'Entregue', 'Não Entregue', 'Cancelado'])
  status!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacaoRetorno?: string;
}

export class DeliveryReturnDto {
  @Transform(trim)
  @IsIn(['Entregue', 'Não Entregue'])
  status!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  motivo?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacao?: string;

  @IsOptional()
  @Transform(trim)
  @IsIn(['WEB', 'APP', 'SISTEMA'])
  origemEvento?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  eventoId?: string;
}

export class CancelDeliveryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  observacao!: string;

  @IsOptional()
  @Transform(trim)
  @IsIn(['WEB', 'APP', 'SISTEMA'])
  origemEvento?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  eventoId?: string;
}

export class ReorderDeliveryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  ordemExecucao!: number;
}

export class ReDeliveryDto {
  @IsISO8601({ strict: true })
  dataEntrega!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacao?: string;

  @IsOptional()
  @Transform(trim)
  @IsIn(['WEB', 'APP', 'SISTEMA'])
  origemEvento?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  eventoId?: string;
}

export class SaveDriverDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  cnh?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  vencimentoCnh?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class SaveVehicleDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  placa!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  marca?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
