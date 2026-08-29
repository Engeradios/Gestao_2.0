import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class ServicesQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) q?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) status?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(30) situacao?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  responsavel?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2) uf?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) prioridade?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) ordenar?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(4) direcao?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5)
  mostrarConcluidos?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  porPagina?: number;
}
export class ServiceMutationDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) proposta?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(220) cliente?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(220)
  clienteLocal?: string;
  @IsOptional() @IsDateString() dataAprovacao?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  diasPreparacao?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  tempoExecucaoDias?: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  tipoProposta?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2) ufExecucao?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  servicoAtividade?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) categoria?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  responsavel?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) prioridade?: string;
  @IsOptional() @IsDateString() inicioPlanejado?: string;
  @IsOptional() @IsDateString() prazoFinal?: string;
  @IsOptional() @IsDateString() inicioReal?: string;
  @IsOptional() @IsDateString() conclusaoReal?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) status?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  percentual?: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  proximaAcao?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  ultimaSituacao?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  observacoes?: string;
}
export class CreateServiceDto extends ServiceMutationDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare proposta: string;
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  declare servicoAtividade: string;
}
export class UpdateServiceDto extends ServiceMutationDto {}
export class CreateProgressDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  descricao!: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  percentual?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) status?: string;
}

/**
 * Campos permitidos na edição administrativa.
 *
 * Não inclui proposta, cliente, aprovação, planejamento,
 * prazo, percentual, categoria, ações ou dados do PDF.
 */
export class AdminUpdateServiceDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  tipoProposta?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2)
  ufExecucao?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  servicoAtividade?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  responsavel?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  prioridade?: string | null;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  status!: string;

  @IsOptional()
  @IsDateString()
  inicioReal?: string | null;

  @IsOptional()
  @IsDateString()
  conclusaoReal?: string | null;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(220) cliente?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(220) clienteLocal?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) contrato?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) pedido?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) contatoNome?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) contatoEmail?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) contatoTelefone?:
    string | null;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  enderecoInstalacao?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(220) titulo?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) categoria?:
    string | null;
  @IsOptional() @IsDateString() dataAprovacao?: string | null;
  @IsOptional() @IsDateString() inicioPlanejado?: string | null;
  @IsOptional() @IsDateString() prazoFinal?: string | null;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  diasPreparacao?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  tempoExecucaoDias?: number | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  percentual?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(5000) proximaAcao?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(5000) ultimaSituacao?:
    string | null;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  observacoes?: string | null;
}
