import { IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['ATIVO', 'INATIVO', 'BLOQUEADO'])
  status!: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
}
