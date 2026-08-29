import { IsBoolean, IsIn } from 'class-validator';

export class AdminNotificationPreferencesDto {
  @IsIn(['OPERACIONAL', 'LOGISTICA', 'AMBAS'])
  areaServicos!: string;

  @IsBoolean()
  receberSolicitacoes!: boolean;

  @IsBoolean()
  receberAberturaServico!: boolean;

  @IsBoolean()
  receberConclusaoFaturamento!: boolean;

  @IsBoolean()
  receberLogistica!: boolean;

  @IsBoolean()
  receberNotificacoesSistema!: boolean;

  @IsBoolean()
  ativo!: boolean;
}
