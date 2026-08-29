import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsMilitaryTime,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class OsSlaScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana!: number;

  @IsBoolean()
  ativo!: boolean;

  @IsMilitaryTime()
  inicio!: string;

  @IsMilitaryTime()
  fim!: string;

  @IsOptional()
  @IsMilitaryTime()
  intervaloInicio?: string | null;

  @IsOptional()
  @IsMilitaryTime()
  intervaloFim?: string | null;
}

export class UpdateOsSlaSchedulesDto {
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => OsSlaScheduleDto)
  horarios!: OsSlaScheduleDto[];
}
