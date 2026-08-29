import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateProposalTypeAreaDto {
  @IsOptional()
  @IsIn(['OPERACIONAL', 'LOGISTICA', 'AMBAS'])
  area?: 'OPERACIONAL' | 'LOGISTICA' | 'AMBAS';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  prazoPadraoDiasUteis?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
