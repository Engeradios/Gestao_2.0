import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivedInvoiceListQueryDto {
  @IsOptional()
  @IsNumberString()
  filialId?: string;

  @IsOptional()
  @IsIn([
    'PENDENTE_CONFERENCIA',
    'EM_CONFERENCIA',
    'ACEITA',
    'RECUSADA',
    'DIVERGENTE',
    'CANCELADA',
  ])
  statusConferencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  busca?: string;
}

export class ReceivedInvoiceItemCheckDto {
  @IsNumberString()
  itemId!: string;

  @IsOptional()
  @IsNumberString()
  produtoId?: string;

  @IsOptional()
  @IsUUID()
  comprasPedidoItemId?: string;

  @IsOptional()
  @IsNumberString()
  quantidadeConferida?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidadeEstoque?: string;

  @IsOptional()
  @IsNumberString()
  fatorConversao?: string;

  @IsOptional()
  @IsBoolean()
  movimentaEstoque?: boolean;

  @IsOptional()
  @IsString()
  divergencia?: string;
}

export class CheckReceivedInvoiceDto {
  @IsIn(['ACEITA', 'RECUSADA', 'DIVERGENTE'])
  status!: 'ACEITA' | 'RECUSADA' | 'DIVERGENTE';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivoRecusa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  divergenciaObs?: string;

  @IsOptional()
  @IsUUID()
  fornecedorId?: string;

  @IsOptional()
  @IsUUID()
  comprasPedidoId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedInvoiceItemCheckDto)
  itens?: ReceivedInvoiceItemCheckDto[];
}

export class MoveReceivedInvoiceStockDto {
  @IsNumberString()
  localId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;
}

export class RegisterManifestationDto {
  @IsIn([
    'CIENCIA',
    'CONFIRMACAO',
    'DESCONHECIMENTO',
    'NAO_REALIZADA',
  ])
  tipo!:
    | 'CIENCIA'
    | 'CONFIRMACAO'
    | 'DESCONHECIMENTO'
    | 'NAO_REALIZADA';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  protocolo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descricao?: string;
}

export class UpdateNsuControlDto {
  @IsNumberString()
  filialId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  ultNsu!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  maxNsu!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  cStat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  xMotivo?: string;

  @IsOptional()
  @IsInt()
  documentosProcessados?: number;
}
