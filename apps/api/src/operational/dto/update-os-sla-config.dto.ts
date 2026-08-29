import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateOsSlaConfigDto {
  @IsInt()
  @Min(1)
  @Max(5256000)
  normalAteMinutos!: number;

  @IsInt()
  @Min(2)
  @Max(5256000)
  atencaoAteMinutos!: number;

  @IsInt()
  @Min(3)
  @Max(5256000)
  urgenteAteMinutos!: number;

  @IsString()
  @MaxLength(80)
  fusoHorario!: string;
}
