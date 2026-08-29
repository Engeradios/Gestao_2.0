import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class ClientsQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) q?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(2, 2) uf?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  porPagina?: number;
}
export class ClientMutationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) codigo?: number;
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  razaoSocial!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(220)
  nomeFantasia?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(30) cnpj?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) endereco?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) bairro?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) municipio?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(2, 2) uf?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(20) cep?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  contatoNome?: string;
  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(180)
  contatoEmail?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  contatoFone?: string;
  @IsOptional()
  @Transform(trim)
  @IsUrl({ require_protocol: true })
  @MaxLength(255)
  website?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
export class CreateClientDto extends ClientMutationDto {}
export class UpdateClientDto extends ClientMutationDto {}
