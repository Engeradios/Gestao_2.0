import { IsBoolean } from 'class-validator';

export class SaveNotificationPreferencesDto {
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
