import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class OsSlaHolidayDto {
  @IsDateString({ strict: true })
  data!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string | null;
}
