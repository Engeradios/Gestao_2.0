import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';
import { FiliaisController } from './filiais/filiais.controller';
import { FiliaisService } from './filiais/filiais.service';
import { FiliaisBrasilApiService } from './filiais/filiais-brasil-api.service';
import { FiliaisCertificadoController } from './filiais/filiais-certificado.controller';
import { FiliaisCertificadoService } from './filiais/filiais-certificado.service';

import { NfeConsultaController } from './nfe-consulta/nfe-consulta.controller';
import { NfeConsultaService } from './nfe-consulta/nfe-consulta.service';
import { NfeImportacaoService } from './nfe-consulta/nfe-importacao.service';
@Module({
  imports: [AuthModule],
  controllers: [
    NfeConsultaController,
    FiliaisCertificadoController,
    FiliaisController,
    FinanceiroController,
  ],
  providers: [
    NfeImportacaoService,
    NfeConsultaService,
    FiliaisCertificadoService,
    FiliaisService,
    FiliaisBrasilApiService,
    FinanceiroService,
  ],
})
export class FinanceiroModule {}
