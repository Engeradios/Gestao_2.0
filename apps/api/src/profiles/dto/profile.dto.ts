import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProfilePermissionDto {
  @IsUUID('4')
  permissaoId!: string;

  @IsIn(['PERMITIR', 'NEGAR'])
  efeito!: 'PERMITIR' | 'NEGAR';
}

export class CreateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  codigo!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfilePermissionDto)
  permissoes!: ProfilePermissionDto[];
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfilePermissionDto)
  permissoes?: ProfilePermissionDto[];
}
