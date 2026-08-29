import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export const DOCUMENT_TYPES = [
  'MINUTA',
  'ASSINADO',
  'ADITIVO',
  'ANEXO',
  'CERTIFICADO',
] as const;

export class UploadContractDocumentDto {
  @Transform(trim) @IsIn(DOCUMENT_TYPES) tipo!: string;
  @IsOptional() @IsUUID('4') andamentoId?: string;
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  documentoPrincipal?: boolean;
}

export class DeleteContractDocumentDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) motivo?: string;
}
