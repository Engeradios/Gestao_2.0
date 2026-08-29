import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReceiveLogisticsProposalDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
