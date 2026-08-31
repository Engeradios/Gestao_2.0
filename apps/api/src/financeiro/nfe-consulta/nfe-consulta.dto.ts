import { IsString, Matches } from 'class-validator';

export class ConsultarNfeChaveDto {
  @IsString()
  @Matches(/^\d{44}$/, {
    message: 'A chave da NF-e deve conter exatamente 44 dígitos.',
  })
  chave!: string;
}
