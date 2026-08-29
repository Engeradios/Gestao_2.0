import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const optionalTrimmed = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  return normalized || undefined;
};

const normalizedEmail = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
};

export class SaveMailConfigurationDto {
  @IsOptional()
  @Transform(optionalTrimmed)
  @IsString()
  @MaxLength(255)
  host?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  porta!: number;

  @IsIn(['SSL', 'STARTTLS', 'NENHUMA'])
  seguranca!: 'SSL' | 'STARTTLS' | 'NENHUMA';

  @IsOptional()
  @Transform(optionalTrimmed)
  @IsString()
  @MaxLength(255)
  usuario?: string;

  @IsOptional()
  @Transform(optionalTrimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  senha?: string;

  @IsOptional()
  @Transform(normalizedEmail)
  @IsEmail()
  @MaxLength(255)
  remetenteEmail?: string;

  @IsOptional()
  @Transform(optionalTrimmed)
  @IsString()
  @MaxLength(160)
  remetenteNome?: string;

  @IsOptional()
  @Transform(normalizedEmail)
  @IsEmail()
  @MaxLength(255)
  responderPara?: string;

  @IsBoolean()
  ativo!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  timeoutSegundos!: number;
}

export class TestMailDeliveryDto {
  @Transform(normalizedEmail)
  @IsEmail()
  @MaxLength(255)
  destinatario!: string;
}
