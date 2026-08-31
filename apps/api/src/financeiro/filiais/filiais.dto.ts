import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
export class FilialDto {
  @IsOptional() @IsString() @MaxLength(40) codigo?: string;
  @IsOptional() @IsString() @MaxLength(120) nome?: string;
  @IsOptional() @IsString() @MaxLength(180) razaoSocial?: string;
  @IsOptional() @IsString() @MaxLength(180) nomeFantasia?: string;
  @IsOptional() @IsString() @Length(14, 14) cnpj?: string;
  @IsOptional() @IsIn(['MATRIZ', 'FILIAL']) tipoEstabelecimento?: string;
  @IsOptional() @IsString() @MaxLength(30) inscricaoEstadual?: string;
  @IsOptional() @IsString() @MaxLength(30) inscricaoMunicipal?: string;
  @IsOptional() @IsString() @Length(8, 8) cep?: string;
  @IsOptional() @IsString() @MaxLength(180) logradouro?: string;
  @IsOptional() @IsString() @MaxLength(20) numero?: string;
  @IsOptional() @IsString() @MaxLength(100) complemento?: string;
  @IsOptional() @IsString() @MaxLength(100) bairro?: string;
  @IsOptional() @IsString() @MaxLength(100) cidade?: string;
  @IsOptional() @IsString() @Length(2, 2) uf?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
