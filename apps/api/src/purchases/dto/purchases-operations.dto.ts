import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePurchasesSupplierDto {
  @Transform(trim) @IsString() @MaxLength(255) razaoSocial!: string;
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomeFantasia?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(20) documento?: string;
  @Transform(trim) @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(30) telefone?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(160) contato?: string;
  @Transform(trim) @IsOptional() @IsString() observacoes?: string;
}

export class UpdatePurchasesSupplierDto extends CreatePurchasesSupplierDto {
  @IsOptional() @IsBoolean() ativo?: boolean;
}
