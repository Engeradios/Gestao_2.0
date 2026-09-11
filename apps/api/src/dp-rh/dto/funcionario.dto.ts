import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFuncionarioDto {
  @IsString()
  @MaxLength(180)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  matricula?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsDateString()
  dataAdmissao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tipoContrato?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  salarioCentavos?: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  gestor?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  @IsOptional()
  @IsUUID()
  setorId?: string;

  @IsOptional()
  @IsUUID()
  cargoId?: string;

  @IsOptional()
  @IsUUID()
  unidadeId?: string;
}

export class UpdateFuncionarioDto extends CreateFuncionarioDto {
  @IsOptional()
  @IsDateString()
  declare dataAdmissao: string;
}

export class ListarFuncionariosDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  busca?: string;

  @IsOptional()
  @IsIn(['ATIVO', 'AFASTADO', 'DESLIGADO'])
  status?: string;

  @IsOptional()
  @IsUUID()
  setorId?: string;

  @IsOptional()
  @IsUUID()
  cargoId?: string;

  @IsOptional()
  @IsUUID()
  unidadeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tamanho?: number;
}

export class CadastroAuxiliarDto {
  @IsString()
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class MovimentacaoDto {
  @IsUUID()
  funcionarioId!: string;

  @IsIn(['ADMISSAO', 'ALTERACAO', 'AFASTAMENTO', 'RETORNO', 'DESLIGAMENTO'])
  tipo!: string;

  @IsDateString()
  data!: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class DesligamentoDto {
  @IsDateString()
  dataDesligamento!: string;

  @IsString()
  @MaxLength(180)
  motivo!: string;

  @IsIn(['EMPRESA', 'FUNCIONARIO', 'ACORDO', 'OUTRO'])
  iniciativa!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  avisoPrevio?: string;

  @IsOptional()
  @IsBoolean()
  elegivelRecontratacao?: boolean;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fim?: string;

  @IsOptional()
  @IsUUID()
  setorId?: string;

  @IsOptional()
  @IsUUID()
  cargoId?: string;

  @IsOptional()
  @IsUUID()
  unidadeId?: string;
}
