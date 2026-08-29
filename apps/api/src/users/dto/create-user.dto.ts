import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  nome!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  unidade?: string;

  @IsOptional()
  @IsUUID('4')
  pessoaId?: string | null;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  perfilIds!: string[];
}
