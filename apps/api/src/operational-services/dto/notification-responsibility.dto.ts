import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
export class CreateNotificationResponsibilityDto {
  @IsUUID() usuarioId!: string;
  @Transform(upper) @IsString() @Length(2, 2) uf!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) praca?: string;
  @Transform(upper)
  @IsIn(['OPERACIONAL', 'LOGISTICA', 'AMBAS'])
  areaResponsavel!: string;
  @IsBoolean() recAbertura!: boolean;
  @IsBoolean() recConclusao!: boolean;
  @IsBoolean() recLogistica!: boolean;
}
export class UpdateNotificationResponsibilityDto {
  @IsOptional() @IsUUID() usuarioId?: string;
  @IsOptional() @Transform(upper) @IsString() @Length(2, 2) uf?: string;
  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(160)
  praca?: string | null;
  @IsOptional()
  @Transform(upper)
  @IsIn(['OPERACIONAL', 'LOGISTICA', 'AMBAS'])
  areaResponsavel?: string;
  @IsOptional() @IsBoolean() recAbertura?: boolean;
  @IsOptional() @IsBoolean() recConclusao?: boolean;
  @IsOptional() @IsBoolean() recLogistica?: boolean;
}
export class UpdateNotificationResponsibilityStatusDto {
  @IsBoolean() ativo!: boolean;
}
